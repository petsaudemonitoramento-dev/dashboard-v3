-- Marcos 3 e 4 · Território mínimo e ingestão SIAPS com motor C3.
--
-- AUTORIDADE DOS DADOS (conforme o contrato):
--   · redistribuição territorial → CNES → unidade → distrito → escopo;
--   · SIAPS → indicador e componentes, e o par INE→CNES observado na
--     competência.
--
-- ESCOPO ANALÍTICO POR LISTA POSITIVA: só entra no painel o estabelecimento
-- explicitamente marcado com `includes_panel`. Policlínica, âncora e tipo
-- desconhecido não entram por omissão. Denominador zero NÃO é critério de
-- exclusão: é uma informação clínica legítima ("sem população elegível") e
-- usá-lo como filtro confundiria ausência de gestantes com fora de escopo.

begin;

-- ---------------------------------------------------------------------------
-- Território
-- ---------------------------------------------------------------------------

create table if not exists core.districts (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists core.establishments (
  id uuid primary key default gen_random_uuid(),
  cnes text not null unique,
  name text not null,
  unit_type text not null default 'OUTRO',
  includes_panel boolean not null default false,
  exclusion_reason text,
  source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint establishments_cnes_format check (cnes ~ '^[0-9]{7}$'),
  constraint establishments_unit_type_valid check (
    unit_type in ('UBS', 'POLICLINICA', 'ANCORA', 'OUTRO')
  )
);

create index if not exists establishments_panel_idx
  on core.establishments (includes_panel);

comment on column core.establishments.includes_panel is
  'Lista positiva. Falso por padrão: um CNES novo não entra no painel sem decisão explícita.';
comment on column core.establishments.unit_type is
  'Classificação descritiva. Nunca derivar includes_panel dela em código: uma policlínica pode ser incluída um dia sem deixar de ser policlínica.';

create table if not exists core.teams (
  id uuid primary key default gen_random_uuid(),
  ine text not null unique,
  name text,
  team_type text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint teams_ine_format check (ine ~ '^[0-9]{10}$')
);

comment on constraint teams_ine_format on core.teams is
  'INE do SIAPS tem 10 dígitos com zeros à esquerda. Preservar como texto: coagir para número destrói o identificador.';

-- Vínculos temporais. O território de uma competência passada não pode ser
-- reescrito por uma reorganização posterior.
create table if not exists core.establishment_district_validity (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references core.establishments(id) on delete cascade,
  district_id uuid not null references core.districts(id) on delete restrict,
  valid_from date not null,
  valid_to date,
  created_at timestamptz not null default now(),
  constraint estab_district_range check (valid_to is null or valid_to >= valid_from)
);

create table if not exists core.team_establishment_validity (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references core.teams(id) on delete cascade,
  establishment_id uuid not null references core.establishments(id) on delete restrict,
  valid_from date not null,
  valid_to date,
  created_at timestamptz not null default now(),
  constraint team_estab_range check (valid_to is null or valid_to >= valid_from)
);

create index if not exists estab_district_lookup
  on core.establishment_district_validity (establishment_id, valid_from, valid_to);
create index if not exists team_estab_lookup
  on core.team_establishment_validity (team_id, valid_from, valid_to);

-- Intervalos sobrepostos tornariam a resolução territorial ambígua.
create unique index if not exists estab_district_no_overlap
  on core.establishment_district_validity (establishment_id, valid_from);
create unique index if not exists team_estab_no_overlap
  on core.team_establishment_validity (team_id, valid_from);

-- ---------------------------------------------------------------------------
-- Ingestão SIAPS
-- ---------------------------------------------------------------------------

alter table siaps.imports
  add column if not exists indicator_code text not null default 'C3',
  add column if not exists competency date,
  add column if not exists municipality_ibge text,
  add column if not exists uf text,
  add column if not exists generated_at timestamptz,
  add column if not exists source_status text,
  add column if not exists scope_signature text,
  add column if not exists source_filters jsonb not null default '{}'::jsonb,
  add column if not exists parser_version text,
  add column if not exists is_current boolean not null default false,
  add column if not exists supersedes_import_id uuid references siaps.imports(id),
  add column if not exists publication_block text,
  add column if not exists rows_total integer,
  add column if not exists rows_eligible integer,
  add column if not exists rows_excluded integer,
  add column if not exists rows_unclassified integer,
  add column if not exists published_at timestamptz,
  add column if not exists published_by uuid references auth.users(id);

alter table siaps.imports
  drop constraint if exists imports_competency_month_start;
alter table siaps.imports
  add constraint imports_competency_month_start check (
    competency is null or competency = date_trunc('month', competency)::date
  );

alter table siaps.imports
  drop constraint if exists imports_source_status_valid;
alter table siaps.imports
  add constraint imports_source_status_valid check (
    source_status is null or source_status in ('preliminar', 'definitivo')
  );

-- Uma única importação vigente por indicador/competência/município.
create unique index if not exists imports_one_current
  on siaps.imports (indicator_code, competency, municipality_ibge)
  where is_current;

create index if not exists imports_competency_idx
  on siaps.imports (indicator_code, competency);

comment on column siaps.imports.generated_at is
  'Momento em que o relatório foi gerado no SIAPS. NÃO é a data de publicação do dado pelo Ministério, e é ele — não o horário do upload — que decide qual versão é mais recente.';
comment on column siaps.imports.scope_signature is
  'Assinatura dos filtros de origem. Escopos incompatíveis não se sobrescrevem em silêncio.';

-- Linhas brutas, fiéis ao arquivo e imutáveis.
create table if not exists siaps.quality_rows (
  id bigint generated always as identity primary key,
  import_id uuid not null references siaps.imports(id) on delete cascade,
  file_row integer not null,
  cnes text,
  establishment_name text,
  establishment_type text,
  ine text,
  team_name text,
  team_type text,
  practice_a integer,
  practice_b integer,
  practice_c integer,
  practice_d integer,
  practice_e integer,
  practice_f integer,
  practice_g integer,
  practice_h integer,
  practice_i integer,
  practice_j integer,
  practice_k integer,
  points_total numeric,
  denominator integer,
  ratio_text text,
  created_at timestamptz not null default now(),
  constraint quality_rows_unique unique (import_id, file_row)
);

create index if not exists quality_rows_import_idx on siaps.quality_rows (import_id);

create or replace function siaps.block_raw_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception
    'siaps.quality_rows é append-only. Para corrigir uma competência, importe novamente e use supersedes_import_id.';
end
$$;

drop trigger if exists quality_rows_no_update on siaps.quality_rows;
create trigger quality_rows_no_update before update on siaps.quality_rows
  for each statement execute function siaps.block_raw_mutation();
drop trigger if exists quality_rows_no_delete on siaps.quality_rows;
create trigger quality_rows_no_delete before delete on siaps.quality_rows
  for each statement execute function siaps.block_raw_mutation();

alter table siaps.quality_rows enable row level security;

-- ---------------------------------------------------------------------------
-- Fatos analíticos
-- ---------------------------------------------------------------------------

create table if not exists analytics_gestao.c3_team_competency (
  id bigint generated always as identity primary key,
  import_id uuid not null references siaps.imports(id) on delete cascade,
  competency date not null,
  team_id uuid references core.teams(id),
  establishment_id uuid references core.establishments(id),
  district_id uuid references core.districts(id),
  source_ine text not null,
  source_cnes text not null,
  source_team_name text,
  source_establishment_name text,
  source_team_type text,
  eligible boolean not null,
  exclusion_reason text,
  denominator integer not null,
  points_total numeric not null,
  official_ratio numeric,
  created_at timestamptz not null default now(),
  constraint c3_denominator_non_negative check (denominator >= 0),
  constraint c3_points_non_negative check (points_total >= 0),
  constraint c3_team_unique unique (import_id, source_ine)
);

create index if not exists c3_competency_idx
  on analytics_gestao.c3_team_competency (competency);
create index if not exists c3_eligible_idx
  on analytics_gestao.c3_team_competency (import_id) where eligible;

create table if not exists analytics_gestao.c3_team_practice (
  fact_id bigint not null references analytics_gestao.c3_team_competency(id) on delete cascade,
  practice_code char(1) not null,
  fulfilled integer not null,
  primary key (fact_id, practice_code),
  constraint practice_code_valid check (practice_code between 'A' and 'K'),
  constraint practice_fulfilled_non_negative check (fulfilled >= 0)
);

comment on table analytics_gestao.c3_team_practice is
  'A..K são CONTAGENS de gestantes que cumpriram a prática — não pontos, não taxas. O denominador é o mesmo para as onze, por isso não existe "elegíveis por prática": taxa e pontos são derivados, nunca armazenados.';

alter table analytics_gestao.c3_team_competency enable row level security;
alter table analytics_gestao.c3_team_practice enable row level security;

-- ---------------------------------------------------------------------------
-- Pesos e classificação
-- ---------------------------------------------------------------------------

create or replace function analytics_gestao.c3_practice_weight(p_code char(1))
returns integer
language sql
immutable
set search_path = ''
as $$
  -- A captação precoce vale 10; as demais, 9. Total: 100.
  select case when p_code = 'A' then 10 else 9 end
$$;

create or replace function analytics_gestao.c3_classify(p_ratio numeric)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when p_ratio is null then null
    when p_ratio > 75 then 'Ótimo'
    when p_ratio > 50 then 'Bom'
    when p_ratio > 25 then 'Suficiente'
    else 'Regular'
  end
$$;

comment on function analytics_gestao.c3_classify is
  'Ótimo >75 e <=100 · Bom >50 e <=75 · Suficiente >25 e <=50 · Regular <=25. Denominador zero devolve NULL: "sem população elegível" não é Regular.';

-- ---------------------------------------------------------------------------
-- Views · recomposição aditiva
-- ---------------------------------------------------------------------------
-- SUM(points)/SUM(denominator) em todos os níveis. Média simples dos
-- percentuais das equipes é proibida pelo contrato e produz erro material no
-- nível da UBS, onde há poucas equipes.

create or replace view analytics_gestao.vw_c3_team
with (security_invoker = true) as
select
  f.id as fact_id,
  f.competency,
  f.source_ine as ine,
  f.source_team_name as team_name,
  f.source_team_type as team_type,
  f.source_cnes as cnes,
  coalesce(e.name, f.source_establishment_name) as establishment_name,
  f.establishment_id,
  f.district_id,
  d.name as district_name,
  f.denominator,
  f.points_total,
  case when f.denominator > 0 then f.points_total / f.denominator end as result,
  f.official_ratio,
  case
    when f.denominator = 0 then null
    else analytics_gestao.c3_classify(f.points_total / f.denominator)
  end as classification,
  case
    when f.denominator = 0 then 'Sem população elegível'
    else 'Avaliada'
  end as situation,
  f.import_id
from analytics_gestao.c3_team_competency f
join siaps.imports i on i.id = f.import_id and i.is_current
left join core.establishments e on e.id = f.establishment_id
left join core.districts d on d.id = f.district_id
where f.eligible;

create or replace view analytics_gestao.vw_c3_establishment
with (security_invoker = true) as
select
  t.competency,
  t.establishment_id,
  t.cnes,
  t.establishment_name,
  t.district_id,
  t.district_name,
  count(*) as teams_total,
  count(*) filter (where t.denominator > 0) as teams_evaluated,
  sum(t.denominator) as denominator,
  sum(t.points_total) as points_total,
  case when sum(t.denominator) > 0
       then sum(t.points_total) / sum(t.denominator) end as result,
  analytics_gestao.c3_classify(
    case when sum(t.denominator) > 0
         then sum(t.points_total) / sum(t.denominator) end
  ) as classification
from analytics_gestao.vw_c3_team t
group by 1,2,3,4,5,6;

create or replace view analytics_gestao.vw_c3_district
with (security_invoker = true) as
select
  t.competency,
  t.district_id,
  coalesce(t.district_name, 'Sem distrito atribuído') as district_name,
  count(distinct t.establishment_id) as establishments_total,
  count(*) as teams_total,
  count(*) filter (where t.denominator > 0) as teams_evaluated,
  sum(t.denominator) as denominator,
  sum(t.points_total) as points_total,
  case when sum(t.denominator) > 0
       then sum(t.points_total) / sum(t.denominator) end as result,
  analytics_gestao.c3_classify(
    case when sum(t.denominator) > 0
         then sum(t.points_total) / sum(t.denominator) end
  ) as classification
from analytics_gestao.vw_c3_team t
group by 1,2,3;

create or replace view analytics_gestao.vw_c3_municipality
with (security_invoker = true) as
select
  t.competency,
  count(distinct t.district_id) as districts_total,
  count(distinct t.establishment_id) as establishments_total,
  count(*) as teams_total,
  count(*) filter (where t.denominator > 0) as teams_evaluated,
  sum(t.denominator) as denominator,
  sum(t.points_total) as points_total,
  case when sum(t.denominator) > 0
       then sum(t.points_total) / sum(t.denominator) end as result,
  analytics_gestao.c3_classify(
    case when sum(t.denominator) > 0
         then sum(t.points_total) / sum(t.denominator) end
  ) as classification
from analytics_gestao.vw_c3_team t
group by 1;

-- Decomposição A–K: é ela que explica por que o território está alto ou baixo.
create or replace view analytics_gestao.vw_c3_practice_municipality
with (security_invoker = true) as
select
  t.competency,
  p.practice_code,
  analytics_gestao.c3_practice_weight(p.practice_code) as weight,
  sum(p.fulfilled) as fulfilled,
  sum(t.denominator) as denominator,
  case when sum(t.denominator) > 0
       then 100.0 * sum(p.fulfilled) / sum(t.denominator) end as fulfillment_rate,
  case when sum(t.denominator) > 0
       then analytics_gestao.c3_practice_weight(p.practice_code)
            * sum(p.fulfilled) / sum(t.denominator) end as contribution,
  analytics_gestao.c3_practice_weight(p.practice_code)
    - coalesce(case when sum(t.denominator) > 0
        then analytics_gestao.c3_practice_weight(p.practice_code)
             * sum(p.fulfilled) / sum(t.denominator) end, 0) as points_lost
from analytics_gestao.vw_c3_team t
join analytics_gestao.c3_team_practice p on p.fact_id = t.fact_id
group by 1,2,3;

-- Estado dos dados para o rodapé obrigatório do painel.
create or replace view analytics_gestao.vw_c3_data_state
with (security_invoker = true) as
select
  max(i.competency) as latest_competency,
  min(i.competency) as earliest_competency,
  count(*) as published_competencies,
  max(i.imported_at) as last_import_at,
  (array_agg(i.source_status order by i.competency desc))[1] as latest_source_status,
  (array_agg(i.generated_at order by i.competency desc))[1] as latest_generated_at
from siaps.imports i
where i.is_current;

-- Registros excluídos, para responder "por que o arquivo tem N e o painel N-8".
create or replace view analytics_gestao.vw_c3_excluded
with (security_invoker = true) as
select
  f.import_id,
  f.competency,
  f.source_cnes as cnes,
  f.source_establishment_name as establishment_name,
  f.source_ine as ine,
  f.source_team_name as team_name,
  f.denominator,
  f.exclusion_reason
from analytics_gestao.c3_team_competency f
where not f.eligible;

commit;

-- ---------------------------------------------------------------------------
-- RLS, grants e exposição
-- ---------------------------------------------------------------------------

begin;

-- core é referência de leitura para qualquer perfil autenticado.
alter table core.districts enable row level security;
alter table core.establishments enable row level security;
alter table core.teams enable row level security;
alter table core.establishment_district_validity enable row level security;
alter table core.team_establishment_validity enable row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'districts', 'establishments', 'teams',
    'establishment_district_validity', 'team_establishment_validity'
  ] loop
    execute format('drop policy if exists %I on core.%I', t || '_read', t);
    execute format(
      'create policy %I on core.%I for select to authenticated using (true)',
      t || '_read', t);
    execute format('grant select on core.%I to authenticated', t);
  end loop;
end
$$;

-- Escrita em core é feita por rotina privilegiada, nunca pelo cliente.
revoke insert, update, delete on all tables in schema core from authenticated, anon;

-- analytics_gestao: leitura apenas para gestão municipal.
-- O contrato é explícito: administrador não recebe acesso por ser
-- administrador, e profissional não acessa a gestão.
do $$
declare t text;
begin
  foreach t in array array['c3_team_competency', 'c3_team_practice'] loop
    execute format('drop policy if exists %I on analytics_gestao.%I', t || '_read', t);
    execute format(
      'create policy %I on analytics_gestao.%I for select to authenticated
         using ((select security.is_active_role(''gestao_municipal'')))',
      t || '_read', t);
    execute format('grant select on analytics_gestao.%I to authenticated', t);
  end loop;
end
$$;

grant select on
  analytics_gestao.vw_c3_team,
  analytics_gestao.vw_c3_establishment,
  analytics_gestao.vw_c3_district,
  analytics_gestao.vw_c3_municipality,
  analytics_gestao.vw_c3_practice_municipality,
  analytics_gestao.vw_c3_data_state,
  analytics_gestao.vw_c3_excluded
to authenticated;

-- USAGE no schema siaps é necessário para que `authenticated` sequer possa
-- CHAMAR as funções de ingestão. O acesso às tabelas continua fechado: o raw
-- permanece revogado e siaps.imports depende de RLS por papel.
grant usage on schema siaps to authenticated;

-- Metadados de importação visíveis à gestão; o raw continua inacessível.
drop policy if exists imports_read_management on siaps.imports;
create policy imports_read_management on siaps.imports
  for select to authenticated
  using ((select security.is_active_role('gestao_municipal')));
grant select on siaps.imports to authenticated;

revoke all on siaps.quality_rows from authenticated, anon;

alter role authenticator
  set pgrst.db_schemas = 'public, storage, graphql_public, core, security, professional, analytics_gestao, siaps';
notify pgrst, 'reload config';

commit;

-- ---------------------------------------------------------------------------
-- Ingestão transacional
-- ---------------------------------------------------------------------------

begin;

create or replace function siaps.ingest_quality_report(
  p_metadata jsonb,
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
  file_row integer;
  v_competency date := (p_metadata->>'competency')::date;
  v_cnes text;
  v_ine text;
  v_establishment_id uuid;
  v_district_id uuid;
  v_team_id uuid;
  v_eligible boolean;
  v_reason text;
  v_denominator integer;
  v_points numeric;
  v_expected numeric;
  v_fact_id bigint;
  practice record;
  total integer := 0;
  eligible_count integer := 0;
  excluded_count integer := 0;
  unclassified_count integer := 0;
  checksum_failures integer := 0;
  v_block text := null;
begin
  if caller_id is null or not security.is_active_role('gestao_municipal') then
    raise exception 'municipal management profile required' using errcode = '42501';
  end if;

  if v_competency is null or v_competency <> date_trunc('month', v_competency)::date then
    raise exception 'invalid competency' using errcode = '22023';
  end if;

  -- Série oficial começa em JAN/2026, conforme o contrato.
  if v_competency < date '2026-01-01' then
    raise exception 'competency before the official series start' using errcode = '22023';
  end if;

  if exists (
    select 1 from siaps.imports
    where sha256 = p_metadata->>'sha256'
  ) then
    raise exception 'file already imported' using errcode = '23505';
  end if;

  insert into siaps.imports (
    filename, sha256, storage_path, imported_by, indicator_code, competency,
    municipality_ibge, uf, generated_at, source_status, scope_signature,
    source_filters, parser_version, status
  )
  values (
    p_metadata->>'filename',
    p_metadata->>'sha256',
    coalesce(p_metadata->>'storagePath', 'pendente/' || (p_metadata->>'sha256')),
    caller_id,
    coalesce(p_metadata->>'indicatorCode', 'C3'),
    v_competency,
    p_metadata->>'municipalityIbge',
    p_metadata->>'uf',
    (p_metadata->>'generatedAt')::timestamptz,
    p_metadata->>'sourceStatus',
    p_metadata->>'scopeSignature',
    coalesce(p_metadata->'sourceFilters', '{}'::jsonb),
    p_metadata->>'parserVersion',
    'recebido'
  )
  returning id into new_import_id;

  for row_data in select * from jsonb_array_elements(coalesce(p_rows, '[]'::jsonb))
  loop
    total := total + 1;
    file_row := (row_data->>'fileRow')::integer;
    v_cnes := row_data->>'cnes';
    v_ine := row_data->>'ine';
    v_denominator := (row_data->>'denominator')::integer;
    v_points := (row_data->>'pointsTotal')::numeric;

    insert into siaps.quality_rows (
      import_id, file_row, cnes, establishment_name, establishment_type,
      ine, team_name, team_type,
      practice_a, practice_b, practice_c, practice_d, practice_e, practice_f,
      practice_g, practice_h, practice_i, practice_j, practice_k,
      points_total, denominator, ratio_text
    )
    values (
      new_import_id, file_row, v_cnes, row_data->>'establishmentName',
      row_data->>'establishmentType', v_ine, row_data->>'teamName',
      row_data->>'teamType',
      (row_data->'practices'->>0)::integer, (row_data->'practices'->>1)::integer,
      (row_data->'practices'->>2)::integer, (row_data->'practices'->>3)::integer,
      (row_data->'practices'->>4)::integer, (row_data->'practices'->>5)::integer,
      (row_data->'practices'->>6)::integer, (row_data->'practices'->>7)::integer,
      (row_data->'practices'->>8)::integer, (row_data->'practices'->>9)::integer,
      (row_data->'practices'->>10)::integer,
      v_points, v_denominator, row_data->>'ratioText'
    );

    -- Checksum: a soma ponderada precisa reproduzir os pontos declarados.
    select sum(analytics_gestao.c3_practice_weight(code) * value)
    into v_expected
    from (
      select (array['A','B','C','D','E','F','G','H','I','J','K'])[i]::char(1) as code,
             coalesce((row_data->'practices'->>(i-1))::integer, 0) as value
      from generate_series(1, 11) as i
    ) as parts;

    if v_expected is distinct from v_points then
      checksum_failures := checksum_failures + 1;
    end if;

    -- Território resolvido NA COMPETÊNCIA.
    select e.id, e.includes_panel,
           case when e.includes_panel then null
                else coalesce(e.exclusion_reason, e.unit_type) end
    into v_establishment_id, v_eligible, v_reason
    from core.establishments e
    where e.cnes = v_cnes;

    if v_establishment_id is null then
      v_eligible := false;
      v_reason := 'ESTABELECIMENTO_NAO_CLASSIFICADO';
      unclassified_count := unclassified_count + 1;
    end if;

    select dv.district_id into v_district_id
    from core.establishment_district_validity dv
    where dv.establishment_id = v_establishment_id
      and dv.valid_from <= v_competency
      and (dv.valid_to is null or dv.valid_to >= v_competency)
    limit 1;

    select t.id into v_team_id from core.teams t where t.ine = v_ine;

    insert into analytics_gestao.c3_team_competency (
      import_id, competency, team_id, establishment_id, district_id,
      source_ine, source_cnes, source_team_name, source_establishment_name,
      source_team_type, eligible, exclusion_reason,
      denominator, points_total, official_ratio
    )
    values (
      new_import_id, v_competency, v_team_id, v_establishment_id, v_district_id,
      v_ine, v_cnes, row_data->>'teamName', row_data->>'establishmentName',
      row_data->>'teamType', coalesce(v_eligible, false), v_reason,
      coalesce(v_denominator, 0), coalesce(v_points, 0),
      nullif(replace(coalesce(row_data->>'ratioText', ''), ',', '.'), '')::numeric
    )
    returning id into v_fact_id;

    for practice in
      select (array['A','B','C','D','E','F','G','H','I','J','K'])[i]::char(1) as code,
             coalesce((row_data->'practices'->>(i-1))::integer, 0) as value
      from generate_series(1, 11) as i
    loop
      insert into analytics_gestao.c3_team_practice (fact_id, practice_code, fulfilled)
      values (v_fact_id, practice.code, practice.value);
    end loop;

    if coalesce(v_eligible, false) then
      eligible_count := eligible_count + 1;
    else
      excluded_count := excluded_count + 1;
    end if;
  end loop;

  -- Publicação fail-closed: estabelecimento sem classificação COM população
  -- torna o denominador oficial indefinido.
  if exists (
    select 1 from analytics_gestao.c3_team_competency f
    where f.import_id = new_import_id
      and not f.eligible
      and f.denominator > 0
      and f.exclusion_reason = 'ESTABELECIMENTO_NAO_CLASSIFICADO'
  ) then
    v_block := 'Há estabelecimento sem classificação territorial com população elegível. Classifique antes de publicar.';
  elsif checksum_failures > 0 then
    v_block := format(
      '%s linha(s) não reproduzem a soma ponderada das boas práticas.',
      checksum_failures);
  end if;

  update siaps.imports
  set rows_total = total,
      rows_eligible = eligible_count,
      rows_excluded = excluded_count,
      rows_unclassified = unclassified_count,
      publication_block = v_block,
      status = case when v_block is null then 'validado' else 'recebido' end
  where id = new_import_id;

  return jsonb_build_object(
    'importId', new_import_id,
    'rowsTotal', total,
    'rowsEligible', eligible_count,
    'rowsExcluded', excluded_count,
    'rowsUnclassified', unclassified_count,
    'checksumFailures', checksum_failures,
    'publicationBlock', v_block
  );
end
$$;

revoke execute on function siaps.ingest_quality_report(jsonb, jsonb) from public, anon;
grant execute on function siaps.ingest_quality_report(jsonb, jsonb) to authenticated;

-- Publicação atômica com supersessão por generated_at.
create or replace function siaps.publish_import(p_import_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  v_import siaps.imports;
  v_current siaps.imports;
begin
  if caller_id is null or not security.is_active_role('gestao_municipal') then
    raise exception 'municipal management profile required' using errcode = '42501';
  end if;

  select * into v_import from siaps.imports where id = p_import_id;
  if not found then
    raise exception 'import not found' using errcode = 'P0002';
  end if;
  if v_import.publication_block is not null then
    raise exception 'publication blocked: %', v_import.publication_block using errcode = '23514';
  end if;
  if v_import.status not in ('validado', 'publicado') then
    raise exception 'import must be validated before publishing' using errcode = '22023';
  end if;

  select * into v_current
  from siaps.imports
  where indicator_code = v_import.indicator_code
    and competency = v_import.competency
    and municipality_ibge = v_import.municipality_ibge
    and is_current
    and id <> p_import_id;

  if found then
    -- Escopos incompatíveis não se sobrescrevem em silêncio.
    if v_current.scope_signature is distinct from v_import.scope_signature then
      raise exception
        'scope signature differs from the published version; review before superseding'
        using errcode = '23514';
    end if;
    -- O horário do upload não decide a versão: quem decide é generated_at.
    if v_import.generated_at is not null
      and v_current.generated_at is not null
      and v_import.generated_at < v_current.generated_at then
      raise exception 'published version was generated more recently'
        using errcode = '23514';
    end if;

    update siaps.imports
    set is_current = false, status = 'substituido'
    where id = v_current.id;

    update siaps.imports
    set supersedes_import_id = v_current.id
    where id = p_import_id and supersedes_import_id is null;
  end if;

  update siaps.imports
  set is_current = true,
      status = 'publicado',
      published_at = now(),
      published_by = caller_id
  where id = p_import_id;

  insert into audit.events (actor_user_id, action, target_type, target_id, metadata)
  values (
    caller_id, 'siaps.import_published', 'siaps.import', p_import_id::text,
    jsonb_build_object(
      'competency', v_import.competency,
      'supersededImportId', v_current.id
    )
  );

  return jsonb_build_object('importId', p_import_id, 'published', true);
end
$$;

revoke execute on function siaps.publish_import(uuid) from public, anon;
grant execute on function siaps.publish_import(uuid) to authenticated;

commit;
