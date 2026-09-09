-- Marco 2 · Módulo Profissional (fonte PEC), privado por proprietário.
--
-- BARREIRA DE DOMÍNIO: nada deste schema alimenta analytics_gestao. O
-- indicador oficial vem exclusivamente do SIAPS. Não existe view, função ou
-- grant ligando os dois domínios.
--
-- MINIMIZAÇÃO (LGPD): não há CPF nem CNS em lugar nenhum deste schema. A
-- identificação da paciente para o profissional é o nome que ele mesmo já
-- possui no PEC, mais a data de nascimento. Como consequência, a
-- desduplicação entre importações não precisa de identificador nacional nem
-- de pseudonimização com segredo de servidor: `dedup_key` deriva de dados que
-- a própria tabela já guarda legitimamente, e nunca sai do escopo do dono.
-- Se um dia CPF/CNS for inevitável, a decisão exige HMAC com segredo
-- exclusivo do servidor — não SHA-256 simples, que é reversível por
-- dicionário no espaço de CPFs.

begin;

-- ---------------------------------------------------------------------------
-- Pacientes
-- ---------------------------------------------------------------------------

alter table professional.patients
  add column if not exists public_id uuid not null default gen_random_uuid(),
  add column if not exists birth_date date,
  add column if not exists dedup_key text,
  add column if not exists prenatal_start_date date,
  add column if not exists due_date date,
  add column if not exists risk_level text,
  add column if not exists source text not null default 'manual',
  add column if not exists import_id uuid,
  add column if not exists archived_at timestamptz;

alter table professional.patients
  drop constraint if exists patients_source_valid;
alter table professional.patients
  add constraint patients_source_valid check (source in ('manual', 'pec'));

alter table professional.patients
  drop constraint if exists patients_risk_level_valid;
alter table professional.patients
  add constraint patients_risk_level_valid check (
    risk_level is null or risk_level in ('habitual', 'alto')
  );

create unique index if not exists patients_public_id_key
  on professional.patients (public_id);

-- Desduplicação por proprietário: a mesma paciente reimportada atualiza em vez
-- de duplicar. O escopo por owner_user_id é essencial — dois profissionais
-- podem legitimamente acompanhar a mesma pessoa sem que um veja o outro.
create unique index if not exists patients_owner_dedup_key
  on professional.patients (owner_user_id, dedup_key)
  where dedup_key is not null and archived_at is null;

create index if not exists patients_owner_active_idx
  on professional.patients (owner_user_id, archived_at);

comment on column professional.patients.public_id is
  'Identificador opaco para uso em URLs. O id sequencial nunca aparece na interface.';
comment on column professional.patients.dedup_key is
  'Chave determinística por proprietário, derivada de nome normalizado + data de nascimento. Sem CPF/CNS.';

-- ---------------------------------------------------------------------------
-- Importações PEC
-- ---------------------------------------------------------------------------

create table if not exists professional.pec_imports (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete restrict,
  filename text not null,
  sha256 text not null,
  storage_path text,
  parser_version text not null,
  rows_read integer not null default 0,
  rows_created integer not null default 0,
  rows_updated integer not null default 0,
  rows_skipped integer not null default 0,
  warnings jsonb not null default '[]'::jsonb,
  status text not null default 'concluida',
  imported_at timestamptz not null default now(),
  constraint pec_imports_sha256_valid check (sha256 ~ '^[a-f0-9]{64}$'),
  constraint pec_imports_status_valid check (status in ('concluida', 'falhou')),
  -- O mesmo arquivo não entra duas vezes para o mesmo profissional.
  constraint pec_imports_owner_file_unique unique (owner_user_id, sha256)
);

create index if not exists pec_imports_owner_idx
  on professional.pec_imports (owner_user_id, imported_at desc);

-- ---------------------------------------------------------------------------
-- Registros clínicos
-- ---------------------------------------------------------------------------
-- owner_user_id é redundante com o da paciente. A redundância é deliberada:
-- permite política de RLS sem subconsulta e impede que um JOIN mal escrito
-- abra acesso lateral. Um gatilho garante que o valor nunca divirja.

create table if not exists professional.encounters (
  id bigint generated always as identity primary key,
  patient_id bigint not null references professional.patients(id) on delete cascade,
  owner_user_id uuid not null,
  occurred_on date not null,
  kind text not null,
  notes text,
  source text not null default 'manual',
  import_id uuid,
  created_at timestamptz not null default now(),
  constraint encounters_kind_valid check (
    kind in ('consulta_prenatal', 'consulta_puerperal', 'visita_domiciliar', 'odontologica', 'outra')
  ),
  constraint encounters_source_valid check (source in ('manual', 'pec'))
);

create table if not exists professional.exams (
  id bigint generated always as identity primary key,
  patient_id bigint not null references professional.patients(id) on delete cascade,
  owner_user_id uuid not null,
  exam_type text not null,
  collected_on date,
  result text,
  created_at timestamptz not null default now(),
  constraint exams_result_valid check (
    result is null or result in ('nao_reagente', 'reagente', 'indeterminado', 'realizado')
  )
);

create table if not exists professional.vaccinations (
  id bigint generated always as identity primary key,
  patient_id bigint not null references professional.patients(id) on delete cascade,
  owner_user_id uuid not null,
  vaccine text not null,
  applied_on date,
  created_at timestamptz not null default now()
);

create table if not exists professional.risk_assessments (
  id bigint generated always as identity primary key,
  patient_id bigint not null references professional.patients(id) on delete cascade,
  owner_user_id uuid not null,
  assessed_on date not null default current_date,
  level text not null,
  factors jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  constraint risk_level_valid check (level in ('habitual', 'alto'))
);

create index if not exists encounters_patient_idx on professional.encounters (patient_id, occurred_on desc);
create index if not exists encounters_owner_idx on professional.encounters (owner_user_id);
create index if not exists exams_patient_idx on professional.exams (patient_id);
create index if not exists exams_owner_idx on professional.exams (owner_user_id);
create index if not exists vaccinations_patient_idx on professional.vaccinations (patient_id);
create index if not exists vaccinations_owner_idx on professional.vaccinations (owner_user_id);
create index if not exists risk_patient_idx on professional.risk_assessments (patient_id, assessed_on desc);
create index if not exists risk_owner_idx on professional.risk_assessments (owner_user_id);

-- Herança automática do proprietário a partir da paciente.
create or replace function professional.inherit_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  resolved_owner uuid;
begin
  select owner_user_id into resolved_owner
  from professional.patients
  where id = new.patient_id;

  if resolved_owner is null then
    raise exception 'patient not found' using errcode = 'P0002';
  end if;

  new.owner_user_id := resolved_owner;
  return new;
end
$$;

do $$
declare t text;
begin
  foreach t in array array['encounters', 'exams', 'vaccinations', 'risk_assessments'] loop
    execute format('drop trigger if exists %I on professional.%I', t || '_inherit_owner', t);
    execute format(
      'create trigger %I before insert or update on professional.%I
         for each row execute function professional.inherit_owner()',
      t || '_inherit_owner', t);
  end loop;
end
$$;

-- ---------------------------------------------------------------------------
-- RLS · posse exclusiva
-- ---------------------------------------------------------------------------

alter table professional.pec_imports enable row level security;
alter table professional.encounters enable row level security;
alter table professional.exams enable row level security;
alter table professional.vaccinations enable row level security;
alter table professional.risk_assessments enable row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'pec_imports', 'encounters', 'exams', 'vaccinations', 'risk_assessments'
  ] loop
    execute format('drop policy if exists %I on professional.%I', t || '_owner_all', t);
    execute format(
      'create policy %I on professional.%I for all to authenticated
         using ((select auth.uid()) = owner_user_id
                and (select security.is_active_role(''profissional'')))
         with check ((select auth.uid()) = owner_user_id
                and (select security.is_active_role(''profissional'')))',
      t || '_owner_all', t);
    execute format('grant select, insert, update, delete on professional.%I to authenticated', t);
  end loop;
end
$$;

grant usage, select on all sequences in schema professional to authenticated;

-- ---------------------------------------------------------------------------
-- Views de apoio
-- ---------------------------------------------------------------------------
-- `security_invoker = true` é obrigatório: sem isso a view roda com os
-- privilégios do dono e ignora o RLS das tabelas de base, expondo os dados de
-- todos os profissionais.

create or replace view professional.vw_patient_overview
with (security_invoker = true) as
select
  p.id,
  p.public_id,
  p.owner_user_id,
  p.display_name,
  p.birth_date,
  p.prenatal_start_date,
  p.due_date,
  p.risk_level,
  p.source,
  p.archived_at,
  p.created_at,
  (select count(*) from professional.encounters e
    where e.patient_id = p.id and e.kind = 'consulta_prenatal') as prenatal_visits,
  (select max(e.occurred_on) from professional.encounters e
    where e.patient_id = p.id) as last_encounter_on,
  (select count(*) from professional.exams x where x.patient_id = p.id) as exam_count,
  (select count(*) from professional.vaccinations v where v.patient_id = p.id) as vaccination_count,
  exists (
    select 1 from professional.vaccinations v
    where v.patient_id = p.id and v.vaccine = 'dtpa'
  ) as has_dtpa
from professional.patients p;

grant select on professional.vw_patient_overview to authenticated;

-- Alertas derivados. Não há tabela de alertas: eles são consequência do estado
-- atual e recalculá-los evita alerta obsoleto persistido.
create or replace view professional.vw_patient_alerts
with (security_invoker = true) as
select
  o.id as patient_id,
  o.public_id,
  o.owner_user_id,
  o.display_name,
  a.code,
  a.severity,
  a.message
from professional.vw_patient_overview o
cross join lateral (
  values
    ('sem_consulta_recente', 'atencao',
     'Sem atendimento registrado nos últimos 60 dias.',
     o.last_encounter_on is null or o.last_encounter_on < current_date - 60),
    ('poucas_consultas', 'atencao',
     'Menos de 7 consultas de pré-natal registradas.',
     o.prenatal_visits < 7),
    ('sem_dtpa', 'atencao',
     'Sem registro de vacina dTpa.',
     not o.has_dtpa),
    ('risco_alto', 'critico',
     'Classificação de risco alto.',
     o.risk_level = 'alto')
) as a(code, severity, message, applies)
where a.applies
  and o.archived_at is null;

grant select on professional.vw_patient_alerts to authenticated;

-- ---------------------------------------------------------------------------
-- Exposição na Data API
-- ---------------------------------------------------------------------------
-- `professional` entra na lista para que a aplicação use o cliente Supabase.
-- O controle é o RLS por proprietário, que é exatamente o que o contrato
-- estabelece para este domínio. `siaps`, `analytics_gestao` e `audit`
-- permanecem fora.

alter role authenticator
  set pgrst.db_schemas = 'public, storage, graphql_public, core, security, professional';
notify pgrst, 'reload config';

commit;

-- ---------------------------------------------------------------------------
-- Importação PEC transacional
-- ---------------------------------------------------------------------------
-- Uma única chamada, uma única transação: ou a importação inteira entra, ou
-- nada entra. Importação parcial deixaria a carteira do profissional num
-- estado que ele não consegue auditar.
--
-- A reimportação do mesmo arquivo é barrada pela unicidade (owner, sha256):
-- o profissional recebe uma resposta explicando, não uma duplicação silenciosa.

create or replace function professional.import_pec_batch(
  p_filename text,
  p_sha256 text,
  p_parser_version text,
  p_rows jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  new_import_id uuid;
  row_data jsonb;
  created integer := 0;
  updated integer := 0;
  existing_id bigint;
  total integer := jsonb_array_length(coalesce(p_rows, '[]'::jsonb));
begin
  if caller_id is null or not security.is_active_role('profissional') then
    raise exception 'professional profile required' using errcode = '42501';
  end if;

  if exists (
    select 1 from professional.pec_imports
    where owner_user_id = caller_id and sha256 = p_sha256
  ) then
    raise exception 'file already imported' using errcode = '23505';
  end if;

  insert into professional.pec_imports (
    owner_user_id, filename, sha256, parser_version, rows_read
  )
  values (caller_id, p_filename, p_sha256, p_parser_version, total)
  returning id into new_import_id;

  for row_data in select * from jsonb_array_elements(coalesce(p_rows, '[]'::jsonb))
  loop
    existing_id := null;

    if nullif(row_data->>'dedupKey', '') is not null then
      select id into existing_id
      from professional.patients
      where owner_user_id = caller_id
        and dedup_key = row_data->>'dedupKey'
        and archived_at is null;
    end if;

    if existing_id is not null then
      -- Atualização conservadora: só preenche o que ainda está vazio, para a
      -- reimportação não apagar o que o profissional editou à mão.
      update professional.patients
      set
        prenatal_start_date = coalesce(prenatal_start_date, (row_data->>'prenatalStartDate')::date),
        due_date = coalesce(due_date, (row_data->>'dueDate')::date),
        risk_level = coalesce(row_data->>'riskLevel', risk_level),
        import_id = new_import_id,
        updated_at = now()
      where id = existing_id;
      updated := updated + 1;
    else
      insert into professional.patients (
        owner_user_id, display_name, birth_date, dedup_key,
        prenatal_start_date, due_date, risk_level, source, import_id
      )
      values (
        caller_id,
        row_data->>'displayName',
        (row_data->>'birthDate')::date,
        nullif(row_data->>'dedupKey', ''),
        (row_data->>'prenatalStartDate')::date,
        (row_data->>'dueDate')::date,
        row_data->>'riskLevel',
        'pec',
        new_import_id
      );
      created := created + 1;
    end if;
  end loop;

  update professional.pec_imports
  set rows_created = created,
      rows_updated = updated,
      rows_skipped = total - created - updated
  where id = new_import_id;

  return jsonb_build_object(
    'importId', new_import_id,
    'rowsRead', total,
    'rowsCreated', created,
    'rowsUpdated', updated
  );
end
$$;

revoke execute on function professional.import_pec_batch(text, text, text, jsonb)
  from public, anon;
grant execute on function professional.import_pec_batch(text, text, text, jsonb)
  to authenticated;

comment on function professional.import_pec_batch is
  'Importa um lote do PEC numa única transação. Revalida o perfil no banco e escreve sempre como owner_user_id = auth.uid(): o chamador não escolhe o dono.';
