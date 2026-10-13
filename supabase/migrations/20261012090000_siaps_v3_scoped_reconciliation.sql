-- MAE APS · Importador SIAPS C3 V2 — migração de conciliação, NÃO executar
-- automaticamente em produção. Não apaga registros e não faz replace global.
-- Pré-requisito operacional: conceder explicitamente escopos para cada gestor.
-- Falha fechada: sem escopo não há publicação; conflitos nunca sobrescrevem.
create table if not exists siaps.c3_editor_scopes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app.profiles(user_id) on delete cascade,
  scope_kind text not null check (scope_kind in ('municipio', 'equipe')),
  -- Os dados legados de MAE APS usam o código '250400' (6 dígitos).
  -- Não alterá-lo silenciosamente para um código de 7 dígitos durante o rollout.
  municipality_ibge text not null default '250400' check (municipality_ibge ~ '^[0-9]{6,7}$'),
  ine text,
  granted_by uuid references app.profiles(user_id),
  granted_at timestamptz not null default now(),
  check (
    (scope_kind = 'municipio' and ine is null) or
    (scope_kind = 'equipe' and ine is not null and ine ~ '^[0-9]{10}$')
  )
);
create unique index if not exists ux_c3_scope_municipio on siaps.c3_editor_scopes(user_id, municipality_ibge) where scope_kind = 'municipio';
create unique index if not exists ux_c3_scope_ine on siaps.c3_editor_scopes(user_id, municipality_ibge, ine) where scope_kind = 'equipe';
create index if not exists ix_c3_scope_actor on siaps.c3_editor_scopes(user_id);

create table if not exists siaps.c3_import_previews (
  id uuid primary key default gen_random_uuid(),
  actor uuid not null references app.profiles(user_id),
  competency date not null,
  filename text not null,
  file_sha256 text not null check (file_sha256 ~ '^[0-9a-f]{64}$'),
  rows_hash text not null,
  snapshot_hash text not null,
  schema_signature text not null default '',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '20 minutes',
  consumed_at timestamptz,
  check (competency = date_trunc('month', competency)::date)
);
create index if not exists ix_c3_previews_actor_created on siaps.c3_import_previews(actor, created_at desc);
create index if not exists ix_c3_previews_expiry on siaps.c3_import_previews(expires_at);

alter table siaps.c3_editor_scopes enable row level security;
alter table siaps.c3_import_previews enable row level security;
revoke all on siaps.c3_editor_scopes, siaps.c3_import_previews from public, anon, authenticated;
grant all on siaps.c3_editor_scopes, siaps.c3_import_previews to service_role;

-- O servidor valida a sessão e não aceita o ID do usuário enviado pelo cliente.
-- A RPC só pode ser chamada pelo service_role. Escopos são conferidos
-- NOVAMENTE pela RPC em cada prévia e em cada publicação.
create or replace function public.preview_siaps_c3_v3(
  p_actor uuid, p_competency date, p_filename text,
  p_file_sha256 text, p_rows jsonb,
  p_schema_signature text default '', p_store boolean default true
) returns jsonb
language plpgsql security definer
set search_path = pg_catalog, public, app, core, siaps, analytics, audit
as $$
declare
  v_row jsonb;
  v_info jsonb;
  v_snapshot text;
  v_preview_id uuid;
  v_new int;
  v_identical int;
  v_conflict int;
  v_unauthorized int;
begin
  if not exists (select 1 from app.profiles p
                 where p.user_id = p_actor and p.active and p.role = 'gestao') then
    raise exception 'Editor inativo ou sem perfil de gestão' using errcode = '42501';
  end if;
  if p_competency is null or p_competency <> date_trunc('month', p_competency)::date
     or p_file_sha256 !~ '^[a-f0-9]{64}$'
     or length(p_schema_signature) > 4000
     or length(p_filename) not between 1 and 255
     or p_filename !~* '[.]xlsx$'
     or jsonb_typeof(p_rows) is distinct from 'array'
     or jsonb_array_length(p_rows) not between 1 and 10000 then
    raise exception 'Metadados de importação inválidos' using errcode = '22023';
  end if;

  -- Validação independente do JavaScript e sem coerção de campos ausentes.
  for v_row in select value from jsonb_array_elements(p_rows)
  loop
    if jsonb_typeof(v_row) <> 'array' or jsonb_array_length(v_row) <> 21
       or (v_row->>0) !~ '^[0-9]+$'
       or (v_row->>1) !~ '^[0-9]{7}$' or (v_row->>1) = '0000000'
       or (v_row->>4) !~ '^[0-9]{10}$' or (v_row->>4) = '0000000000'
       or jsonb_typeof(v_row->19) <> 'number'
       or jsonb_typeof(v_row->18) <> 'number' then
      raise exception 'Registro C3 com identificadores ou formato inválidos' using errcode = '22023';
    end if;
    if (v_row->>0)::int <= 0
       or (v_row->>19)::numeric < 0 or (v_row->>19)::numeric <> trunc((v_row->>19)::numeric)
       or (v_row->>18)::numeric < 0
       or (v_row->20 <> 'null'::jsonb and
         (jsonb_typeof(v_row->20) <> 'number' or (v_row->>20)::numeric not between 0 and 100)) then
      raise exception 'Contagens, razão ou linha C3 inválidas' using errcode = '22023';
    end if;
    if exists (
      select 1 from generate_series(7,17) n
      where jsonb_typeof(v_row->n) <> 'number'
         or (v_row->>n)::numeric < 0
         or (v_row->>n)::numeric <> trunc((v_row->>n)::numeric)
         or (v_row->>n)::numeric > (v_row->>19)::numeric
    ) then
      raise exception 'Componentes C3 inválidos' using errcode = '22023';
    end if;
    if (v_row->>18)::numeric <> 10 * (v_row->>7)::numeric
       + 9 * (select sum((v_row->>n)::numeric) from generate_series(8,17) n) then
      raise exception 'Pontuação C3 divergente da soma ponderada' using errcode = '22023';
    end if;
  end loop;
  if exists (
    select 1 from jsonb_array_elements(p_rows) v
    group by v->>4 having count(*) > 1
  ) or exists (
    select 1 from jsonb_array_elements(p_rows) v
    group by v->>0 having count(*) > 1
  ) then
    raise exception 'Planilha contém INE ou linhas duplicadas' using errcode = '22023';
  end if;

  -- Escopo default-deny, sem confiança em distrito ou UBS informados no XLSX.
  -- Histórico e contagens são comparados com a versão analítica vigente.
  with incoming as (
    select r.value as raw, (r.value->>0)::integer as file_row,
           r.value->>1 as cnes, r.value->>4 as ine,
           (r.value->>19)::integer as denominator,
           (r.value->>18)::numeric as points,
           (r.value->>20)::numeric as ratio,
           (select jsonb_agg((r.value->>n)::integer order by n)
            from generate_series(7,17) n) as components
    from jsonb_array_elements(p_rows) r(value)
  ), joined as (
    select i.*,
           t.id as team_id, f.id as current_id,
           f.source_import_id, f.denominator as old_denominator,
           f.points_total as old_points, f.official_ratio as old_ratio,
           e.cnes as current_cnes,
           (select jsonb_agg(pc.fulfilled order by pc.practice_code)
            from analytics.c3_practice_counts pc where pc.fact_id = f.id) as old_components,
           exists (
             select 1 from siaps.c3_editor_scopes sc
             where sc.user_id = p_actor and sc.municipality_ibge = '250400'
             and (sc.scope_kind = 'municipio' or (sc.scope_kind = 'equipe' and sc.ine = i.ine))
           ) as allowed,
           exists (
             select 1 from core.team_establishment_history h
             join core.establishments eh on eh.id = h.establishment_id
             where h.team_id = t.id and h.valid_from <= p_competency
             and (h.valid_to is null or h.valid_to >= p_competency)
             and eh.cnes <> i.cnes
           ) as incompatible_link
    from incoming i
    left join core.teams t on t.ine = i.ine
    left join analytics.c3_team_monthly f
      on f.team_id = t.id and f.competency = p_competency and f.is_current
    left join core.establishments e on e.id = f.establishment_id
  ), decisions as (
    select *,
       case
        when not allowed then 'fora_escopo'
        when current_id is null and incompatible_link then 'conflito'
        when current_id is null then 'novo'
        when current_cnes = cnes and old_denominator = denominator
         and old_points = points and old_ratio is not distinct from ratio
         and old_components = components then 'identico'
        else 'conflito'
       end as decision
    from joined
  ), agg as (
    select count(*) filter (where decision = 'novo')::integer as n,
           count(*) filter (where decision = 'identico')::integer as same,
           count(*) filter (where decision = 'conflito')::integer as conflict,
           count(*) filter (where decision = 'fora_escopo')::integer as denied,
           md5(coalesce(string_agg(
             ine || ':' || decision || ':' || coalesce(current_id::text, '-') || ':' ||
             coalesce(source_import_id::text, '-') || ':' || allowed::text,
             '|' order by ine
           ),'')) as fingerprint
    from decisions
  )
  select jsonb_build_object(
    'new', agg.n, 'identical', agg.same, 'conflicts', agg.conflict,
    'unauthorized', agg.denied, 'snapshot', agg.fingerprint,
    'details', coalesce((
       select jsonb_agg(jsonb_build_object(
         'fileRow', d.file_row, 'ine', d.ine, 'cnes', d.cnes, 'status', d.decision
       ) order by d.file_row)
       from (select file_row, ine, cnes, decision from decisions
             where decision in ('conflito', 'fora_escopo')
             order by file_row limit 50) d
    ), '[]'::jsonb))
  into v_info
  from agg;
  v_snapshot := v_info->>'snapshot';

  if p_store then
    insert into siaps.c3_import_previews(
       actor, competency, filename, file_sha256, rows_hash, snapshot_hash, schema_signature
    ) values (
       p_actor, p_competency, p_filename, p_file_sha256, md5(p_rows::text), v_snapshot, p_schema_signature
    ) returning id into v_preview_id;
  end if;
  return v_info || jsonb_build_object('previewId', v_preview_id);
end;
$$;

create or replace function public.publish_siaps_c3_v3(
  p_actor uuid, p_preview_id uuid, p_competency date, p_filename text,
  p_file_sha256 text, p_rows jsonb, p_schema_signature text
) returns jsonb
language plpgsql security definer
set search_path = pg_catalog, public, app, core, siaps, analytics, audit
as $$
declare
  v_pre siaps.c3_import_previews%rowtype;
  v_check jsonb;
  v_import_id uuid;
  v_new int;
  v_same int;
begin
  -- Permissões são serializadas por editor e publicação por competência.
  -- Primeiro trava o editor; a administração usa a mesma chave para escopos.
  perform pg_advisory_xact_lock(hashtext('mae-aps-siaps-c3-editor:' || p_actor::text));
  -- Inclui competências sem nenhum dado corrente: não há row lock possível.
  perform pg_advisory_xact_lock(hashtext('mae-aps-siaps-c3:' || p_competency::text));
  select * into v_pre from siaps.c3_import_previews
  where id = p_preview_id for update;
  if not found or v_pre.actor <> p_actor or v_pre.competency <> p_competency
    or v_pre.filename <> p_filename or v_pre.file_sha256 <> p_file_sha256
    or v_pre.rows_hash <> md5(p_rows::text)
    or v_pre.schema_signature <> p_schema_signature or v_pre.expires_at < now()
    or v_pre.consumed_at is not null then
    raise exception 'Prévia vencida, incompatível ou já utilizada; analise novamente'
      using errcode = '22023';
  end if;
  v_check := public.preview_siaps_c3_v3(
    p_actor, p_competency, p_filename, p_file_sha256, p_rows, p_schema_signature, false);
  if v_pre.snapshot_hash <> v_check->>'snapshot' then
    raise exception 'Os registros mudaram após a prévia. Analise novamente.'
      using errcode = '40001';
  end if;
  if (v_check->>'conflicts')::int > 0 or (v_check->>'unauthorized')::int > 0 then
    raise exception 'Importação contém conflitos ou equipes fora da permissão; nenhum registro foi alterado'
      using errcode = '23514';
  end if;
  v_new := (v_check->>'new')::int;
  v_same := (v_check->>'identical')::int;

  if exists (select 1 from siaps.imports where file_sha256 = p_file_sha256
             and competency <> p_competency) then
    raise exception 'Mesmo arquivo SHA-256 vinculado a outra competência'
      using errcode = '23505';
  end if;
  if exists (select 1 from siaps.imports where file_sha256 = p_file_sha256) then
    if v_new > 0 then
      raise exception 'Arquivo já foi publicado e possui novos registros; reavaliar a origem'
        using errcode = '23505';
    end if;
  elsif v_new > 0 then
    -- Inclui somente equipes sem linha analítica corrente nesta competência.
    insert into siaps.imports (
      filename, file_sha256, competency, indicator_code, indicator_name,
      municipality_ibge, municipality_name, uf, source_status,
      source_filters, parser_version, status, rows_total, uploaded_by, published_at
    ) values (
      p_filename, p_file_sha256, p_competency, 'C3',
      'Cuidado na Gestação e Puerpério', '250400', 'CAMPINA GRANDE',
      'PB', 'preliminar',
      jsonb_build_object('mode','conciliação por equipe','new',v_new,'identical',v_same,
        'schema_signature',p_schema_signature),
      'mae-aps-c3/2.0.0', 'publicado', jsonb_array_length(p_rows), p_actor, now()
    ) returning id into v_import_id;

    insert into core.establishments(
      cnes, name, establishment_type, first_seen_competency, last_seen_competency
    )
    select r.value->>1, max(coalesce(nullif(r.value->>2,''), 'CNES ' || (r.value->>1))),
           max(nullif(r.value->>3,'')), p_competency, p_competency
    from jsonb_array_elements(p_rows) r(value)
    group by r.value->>1
    on conflict (cnes) do nothing;

    insert into core.teams(ine, name, team_type, first_seen_competency, last_seen_competency)
    select r.value->>4, max(nullif(r.value->>5,'')),
           max(nullif(r.value->>6,'')), p_competency, p_competency
    from jsonb_array_elements(p_rows) r(value)
    group by r.value->>4
    on conflict (ine) do nothing;

    insert into core.team_establishment_history(team_id, establishment_id, valid_from, source)
    select distinct t.id, e.id, p_competency, 'siaps'
    from jsonb_array_elements(p_rows) r(value)
    join core.teams t on t.ine = r.value->>4
    join core.establishments e on e.cnes = r.value->>1
    where not exists (
      select 1 from core.team_establishment_history h
      where h.team_id = t.id and h.establishment_id = e.id
        and h.valid_from <= p_competency
        and (h.valid_to is null or h.valid_to >= p_competency)
    )
    and not exists (
      select 1 from core.team_establishment_history h
      where h.team_id = t.id and h.valid_from <= p_competency
        and (h.valid_to is null or h.valid_to >= p_competency)
    );

    insert into siaps.quality_rows (
      import_id, file_row, cnes, establishment_name, establishment_type,
      ine, team_name, team_type, practice_a, practice_b, practice_c, practice_d,
      practice_e, practice_f, practice_g, practice_h, practice_i, practice_j,
      practice_k, points_total, denominator, official_ratio, raw_payload
    )
    select v_import_id, (x.value->>0)::int, x.value->>1, x.value->>2,
      x.value->>3, x.value->>4, x.value->>5, x.value->>6,
      (x.value->>7)::int, (x.value->>8)::int, (x.value->>9)::int,
      (x.value->>10)::int, (x.value->>11)::int, (x.value->>12)::int,
      (x.value->>13)::int, (x.value->>14)::int, (x.value->>15)::int,
      (x.value->>16)::int, (x.value->>17)::int,
      (x.value->>18)::numeric, (x.value->>19)::int, (x.value->>20)::numeric,
      jsonb_build_object('ine',x.value->>4,'cnes',x.value->>1)
    from jsonb_array_elements(p_rows) x(value);

    insert into analytics.c3_team_monthly (
      source_import_id, competency, team_id, establishment_id, district_id,
      denominator, points_total, official_ratio, is_current
    )
    select v_import_id, p_competency, t.id, e.id, dh.district_id,
      (r.value->>19)::int, (r.value->>18)::numeric, (r.value->>20)::numeric, true
    from jsonb_array_elements(p_rows) r(value)
    join core.teams t on t.ine = r.value->>4
    join core.establishments e on e.cnes = r.value->>1
    left join lateral (
      select h.district_id
      from core.establishment_district_history h
      where h.establishment_id = e.id
       and h.valid_from <= p_competency
       and (h.valid_to is null or h.valid_to >= p_competency)
      order by h.valid_from desc limit 1
    ) dh on true
    where not exists (
      select 1 from analytics.c3_team_monthly f
      where f.team_id=t.id and f.competency=p_competency and f.is_current
    );

    insert into analytics.c3_practice_counts (fact_id, practice_code, fulfilled)
    select f.id, substring('ABCDEFGHIJK' from s.n - 6 for 1)::char(1),
      (r.value->>s.n)::int
    from jsonb_array_elements(p_rows) r(value)
    join core.teams t on t.ine = r.value->>4
    join analytics.c3_team_monthly f
      on f.team_id = t.id and f.source_import_id=v_import_id
    cross join generate_series(7,17) s(n);
  end if;

  update siaps.c3_import_previews set consumed_at = now()
   where id = p_preview_id;

  insert into audit.events(actor_user_id, event_type, entity_type, entity_id, metadata)
  values (
    p_actor, 'siaps_c3_v3_reconciled', 'siaps.imports',
    coalesce(v_import_id::text, p_preview_id::text),
    jsonb_build_object('competency', p_competency,'file_sha256',p_file_sha256,
      'new',v_new,'identical',v_same,'result',case when v_new=0 then 'sem_alteracoes' else 'publicado' end)
  );
  return jsonb_build_object(
    'status',case when v_new=0 then 'sem_alteracoes' else 'publicado' end,
    'importId',v_import_id, 'new',v_new, 'identical',v_same,
    'conflicts',0,'unauthorized',0
  );
end;
$$;

revoke all on function public.preview_siaps_c3_v3(uuid,date,text,text,jsonb,text,boolean)
  from public, anon, authenticated;
revoke all on function public.publish_siaps_c3_v3(uuid,uuid,date,text,text,jsonb,text)
  from public, anon, authenticated;
grant execute on function public.preview_siaps_c3_v3(uuid,date,text,text,jsonb,text,boolean)
  to service_role;
grant execute on function public.publish_siaps_c3_v3(uuid,uuid,date,text,text,jsonb,text)
  to service_role;


-- Administração dos escopos: escrita e auditoria ocorrem na MESMA transação.
-- Um gestor não pode elevar seu próprio escopo por chamadas diretas.
create or replace function public.manage_siaps_c3_scope_v3(
  p_actor uuid, p_target uuid, p_action text, p_scope_kind text, p_ine text default null
) returns jsonb
language plpgsql security definer
set search_path = pg_catalog, public, app, siaps, audit
as $$
declare
  v_changed int;
begin
  if not exists (
    select 1 from app.profiles p
    where p.user_id = p_actor and p.role = 'admin' and p.active
  ) then
    raise exception 'Administrador ativo obrigatório' using errcode = '42501';
  end if;
  if not exists (
    select 1 from app.profiles p
    where p.user_id = p_target and p.role = 'gestao' and p.active
  ) then
    raise exception 'Editor de gestão deve estar ativo' using errcode = '22023';
  end if;
  if p_action not in ('grant', 'revoke')
     or p_scope_kind not in ('municipio', 'equipe')
     or (p_scope_kind = 'equipe' and (p_ine is null or p_ine !~ '^[0-9]{10}$'))
     or (p_scope_kind = 'municipio' and p_ine is not null) then
    raise exception 'Escopo inválido' using errcode = '22023';
  end if;

  -- Revogação e publicação do mesmo editor jamais passam em paralelo.
  perform pg_advisory_xact_lock(hashtext('mae-aps-siaps-c3-editor:' || p_target::text));
  if p_action = 'grant' then
    insert into siaps.c3_editor_scopes(user_id, scope_kind, municipality_ibge, ine, granted_by)
    values(p_target, p_scope_kind, '250400', p_ine, p_actor)
    on conflict do nothing;
    get diagnostics v_changed = row_count;
  else
    delete from siaps.c3_editor_scopes sc
    where sc.user_id = p_target and sc.scope_kind = p_scope_kind
      and sc.municipality_ibge = '250400'
      and sc.ine is not distinct from p_ine;
    get diagnostics v_changed = row_count;
  end if;
  insert into audit.events(actor_user_id, event_type, entity_type, entity_id, metadata)
  values (
    p_actor, 'siaps_c3_scope_' || p_action,
    'siaps.c3_editor_scopes', p_target::text,
    jsonb_build_object('actor',p_actor,'target',p_target,'scope',p_scope_kind,
      'ine',p_ine,'changed',v_changed)
  );
  return jsonb_build_object('status','ok','affected',v_changed);
end;
$$;
revoke all on function public.manage_siaps_c3_scope_v3(uuid,uuid,text,text,text)
  from public, anon, authenticated;
grant execute on function public.manage_siaps_c3_scope_v3(uuid,uuid,text,text,text)
  to service_role;

-- ATENÇÃO: retirar execução de RPCs antigas somente na janela de ativação
-- coordenada com o deploy do novo endpoint, senão a versão atual perde importação.
-- Na ativação final, executar sob transação:
-- revoke execute on function public.publish_siaps_c3_v2(jsonb,jsonb) from service_role;
-- revoke execute on function public.publish_siaps_c3_v1(jsonb,jsonb) from service_role;
