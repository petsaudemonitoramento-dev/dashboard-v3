-- Hardening incremental da V1.0.0 do MAE APS.
-- Preserva dados, UUIDs e histórico. Não recria estruturas-base.

-- Publicação SIAPS atômica: único ponto privilegiado de escrita usado pela API.
create or replace function public.publish_siaps_c3_v1(
  p_metadata jsonb,
  p_rows jsonb
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, app, core, siaps, analytics, audit
as $function$
declare
  v_actor uuid;
  v_filename text;
  v_competency text;
  v_count integer;
begin
  if jsonb_typeof(p_metadata) <> 'object' or jsonb_typeof(p_rows) <> 'array' then
    raise exception 'Payload SIAPS inválido' using errcode = '22023';
  end if;

  begin
    v_actor := nullif(p_metadata->>'uploaded_by', '')::uuid;
  exception when invalid_text_representation then
    raise exception 'Usuário de importação inválido' using errcode = '22023';
  end;

  if not exists (
    select 1
    from app.profiles
    where user_id = v_actor
      and active
      and role = 'gestao'::app.user_role
  ) then
    raise exception 'Apenas a Gestão ativa pode importar dados' using errcode = '42501';
  end if;

  v_filename := p_metadata->>'filename';
  if v_filename is null
     or length(v_filename) > 255
     or lower(right(v_filename, 5)) <> '.xlsx'
     or position('/' in v_filename) > 0
     or position(chr(92) in v_filename) > 0 then
    raise exception 'Nome de arquivo inválido' using errcode = '22023';
  end if;

  if coalesce(p_metadata->>'file_sha256', '') !~ '^[a-f0-9]{64}$' then
    raise exception 'SHA-256 inválido' using errcode = '22023';
  end if;

  v_competency := p_metadata->>'competency';
  if coalesce(v_competency, '') !~ '^20[0-9]{2}-(0[1-9]|1[0-2])-01$' then
    raise exception 'Competência inválida' using errcode = '22023';
  end if;

  v_count := jsonb_array_length(p_rows);
  if v_count < 1 or v_count > 10000 then
    raise exception 'Quantidade de linhas inválida' using errcode = '22023';
  end if;

  begin
    if coalesce((p_metadata->>'rows_total')::integer, -1) <> v_count then
      raise exception 'Quantidade de linhas inválida' using errcode = '22023';
    end if;
  exception when invalid_text_representation or numeric_value_out_of_range then
    raise exception 'Quantidade de linhas inválida' using errcode = '22023';
  end;

  if exists (
    select 1
    from jsonb_array_elements(p_rows) r
    where jsonb_typeof(r) <> 'array' or jsonb_array_length(r) <> 21
  ) then
    raise exception 'Linha SIAPS inválida' using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_rows) r
    where (r->>0) !~ '^[1-9][0-9]*$'
       or (r->>1) !~ '^[0-9]{7}$'
       or (r->>4) !~ '^[0-9]{10}$'
       or (r->>7) !~ '^[0-9]+$'
       or (r->>8) !~ '^[0-9]+$'
       or (r->>9) !~ '^[0-9]+$'
       or (r->>10) !~ '^[0-9]+$'
       or (r->>11) !~ '^[0-9]+$'
       or (r->>12) !~ '^[0-9]+$'
       or (r->>13) !~ '^[0-9]+$'
       or (r->>14) !~ '^[0-9]+$'
       or (r->>15) !~ '^[0-9]+$'
       or (r->>16) !~ '^[0-9]+$'
       or (r->>17) !~ '^[0-9]+$'
       or (r->>18) !~ '^[0-9]+([.][0-9]+)?$'
       or (r->>19) !~ '^[0-9]+$'
  ) then
    raise exception 'Identificadores ou medidas SIAPS inválidos' using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_rows) r
    where (r->>7)::integer > (r->>19)::integer
       or (r->>8)::integer > (r->>19)::integer
       or (r->>9)::integer > (r->>19)::integer
       or (r->>10)::integer > (r->>19)::integer
       or (r->>11)::integer > (r->>19)::integer
       or (r->>12)::integer > (r->>19)::integer
       or (r->>13)::integer > (r->>19)::integer
       or (r->>14)::integer > (r->>19)::integer
       or (r->>15)::integer > (r->>19)::integer
       or (r->>16)::integer > (r->>19)::integer
       or (r->>17)::integer > (r->>19)::integer
       or (r->>18)::numeric <>
          10 * (r->>7)::numeric
          + 9 * (
            (r->>8)::numeric + (r->>9)::numeric + (r->>10)::numeric
            + (r->>11)::numeric + (r->>12)::numeric + (r->>13)::numeric
            + (r->>14)::numeric + (r->>15)::numeric + (r->>16)::numeric
            + (r->>17)::numeric
          )
       or (
         (r->20) <> 'null'::jsonb
         and (
           (r->>20) !~ '^[0-9]+([.][0-9]+)?$'
           or (r->>20)::numeric < 0
           or (r->>20)::numeric > 100
         )
       )
  ) then
    raise exception 'Medidas C3 inconsistentes' using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_rows) r
    group by r->>0
    having count(*) > 1
  ) or exists (
    select 1
    from jsonb_array_elements(p_rows) r
    group by r->>4
    having count(*) > 1
  ) then
    raise exception 'Linha ou INE duplicado no arquivo' using errcode = '22023';
  end if;

  return public.ingest_siaps_c3_compact(p_metadata, p_rows);
end;
$function$;

revoke all on function public.publish_siaps_c3_v1(jsonb, jsonb)
from public, anon, authenticated;
grant execute on function public.publish_siaps_c3_v1(jsonb, jsonb)
to service_role;

-- Fecha os pontos legados de ingestão direta ao service_role.
-- publish_siaps_c3_v1, como SECURITY DEFINER, continua reutilizando a rotina
-- interna como proprietário sem reabrir os endpoints antigos.
revoke execute on function public.ingest_siaps_c3(jsonb, jsonb)
from service_role;
revoke execute on function public.stage_siaps_c3_compact(jsonb, jsonb, boolean)
from service_role;
revoke execute on function public.ingest_siaps_c3_compact(jsonb, jsonb)
from service_role;

-- Mantém a RPC cadastral existente e corrige a normalização de espaços,
-- preservando as duas confirmações, UUID interno e auditoria.
create or replace function public.update_establishment_identity(
  p_establishment_id uuid,
  p_cnes text,
  p_name text,
  p_confirm_official boolean,
  p_confirm_impact boolean
)
returns core.establishments
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_actor uuid := auth.uid();
  v_current core.establishments%rowtype;
  v_result core.establishments%rowtype;
  v_cnes text := btrim(p_cnes);
  v_name text := regexp_replace(btrim(p_name), '[[:space:]]+', ' ', 'g');
begin
  if not exists (
    select 1
    from app.profiles
    where user_id = v_actor
      and active
      and role = 'admin'::app.user_role
  ) then
    raise exception 'Apenas administradores ativos podem ajustar nome e CNES'
      using errcode = '42501';
  end if;

  if p_confirm_official is distinct from true
     or p_confirm_impact is distinct from true then
    raise exception 'As duas confirmações de segurança são obrigatórias'
      using errcode = '22023';
  end if;

  if v_cnes !~ '^[0-9]{7}$' then
    raise exception 'CNES deve conter exatamente 7 dígitos'
      using errcode = '22023';
  end if;

  if char_length(v_name) < 3 or char_length(v_name) > 200 then
    raise exception 'Nome da UBS deve conter entre 3 e 200 caracteres'
      using errcode = '22023';
  end if;

  select *
  into v_current
  from core.establishments
  where id = p_establishment_id
  for update;

  if v_current.id is null then
    raise exception 'Estabelecimento não encontrado';
  end if;

  if exists (
    select 1
    from core.establishments
    where cnes = v_cnes
      and id <> p_establishment_id
  ) then
    raise exception 'CNES já vinculado a outro estabelecimento'
      using errcode = '23505';
  end if;

  if v_current.cnes = v_cnes and v_current.name = v_name then
    return v_current;
  end if;

  update core.establishments
  set cnes = v_cnes,
      name = v_name,
      updated_at = now()
  where id = p_establishment_id
  returning * into v_result;

  insert into audit.events(
    actor_user_id,
    event_type,
    entity_type,
    entity_id,
    metadata
  )
  values (
    v_actor,
    'establishment_identity_changed',
    'core.establishments',
    p_establishment_id::text,
    jsonb_build_object(
      'previous_name', v_current.name,
      'name', v_result.name,
      'previous_cnes', v_current.cnes,
      'cnes', v_result.cnes,
      'risk_confirmed', true,
      'official_source_confirmed', true
    )
  );

  return v_result;
end;
$function$;

revoke all on function public.update_establishment_identity(
  uuid, text, text, boolean, boolean
) from public, anon;
grant execute on function public.update_establishment_identity(
  uuid, text, text, boolean, boolean
) to authenticated;

-- RLS por responsabilidade institucional.
drop policy if exists c3_practices_active_users_read
on analytics.c3_practice_counts;
drop policy if exists c3_practices_dashboard_read
on analytics.c3_practice_counts;
create policy c3_practices_dashboard_read
on analytics.c3_practice_counts
for select to authenticated
using (
  exists (
    select 1
    from app.profiles p
    where p.user_id = (select auth.uid())
      and p.active
      and p.role in ('gestao'::app.user_role, 'leitura'::app.user_role)
  )
);

drop policy if exists c3_monthly_active_users_read
on analytics.c3_team_monthly;
drop policy if exists c3_monthly_dashboard_read
on analytics.c3_team_monthly;
create policy c3_monthly_dashboard_read
on analytics.c3_team_monthly
for select to authenticated
using (
  exists (
    select 1
    from app.profiles p
    where p.user_id = (select auth.uid())
      and p.active
      and p.role in ('gestao'::app.user_role, 'leitura'::app.user_role)
  )
);

drop policy if exists imports_active_users_read
on siaps.imports;
drop policy if exists imports_gestao_read
on siaps.imports;
create policy imports_gestao_read
on siaps.imports
for select to authenticated
using (
  exists (
    select 1
    from app.profiles p
    where p.user_id = (select auth.uid())
      and p.active
      and p.role = 'gestao'::app.user_role
  )
);

-- O schema study é legado técnico e não integra a interface da V1.
drop policy if exists cohort_members_active_users_read on study.cohort_members;
drop policy if exists cohorts_active_users_read on study.cohorts;
revoke select on study.cohort_members, study.cohorts from authenticated;
revoke usage on schema study from authenticated;

-- Camada analítica estável para Dashboard e futura conexão read-only do Metabase.
create or replace view analytics.dashboard_team_directory
with (security_invoker = true)
as
select
  t.id as team_id,
  t.ine,
  t.name as team_name,
  t.team_type,
  e.id as establishment_id,
  e.cnes,
  e.name as establishment_name,
  d.id as district_id,
  d.name as district_name
from core.teams t
left join core.team_establishment_history teh
  on teh.team_id = t.id
 and teh.valid_to is null
left join core.establishments e
  on e.id = teh.establishment_id
left join core.establishment_district_history edh
  on edh.establishment_id = e.id
 and edh.valid_to is null
left join core.districts d
  on d.id = edh.district_id
where t.active;

create or replace view analytics.dashboard_c3_team_monthly
with (security_invoker = true)
as
select
  f.id as fact_id,
  f.competency,
  f.district_id,
  d.name as district_name,
  f.establishment_id,
  e.cnes,
  e.name as establishment_name,
  f.team_id,
  t.ine,
  t.name as team_name,
  f.denominator,
  f.points_total,
  f.points_total / nullif(f.denominator, 0) as c3,
  case
    when f.denominator = 0 then 'Sem população elegível'
    when f.points_total / nullif(f.denominator, 0) < 0
      or f.points_total / nullif(f.denominator, 0) > 100 then 'Valor inválido'
    when f.points_total / nullif(f.denominator, 0) > 75 then 'Ótimo'
    when f.points_total / nullif(f.denominator, 0) > 50 then 'Bom'
    when f.points_total / nullif(f.denominator, 0) > 25 then 'Suficiente'
    else 'Regular'
  end as classification
from analytics.c3_team_monthly f
join core.teams t
  on t.id = f.team_id
join core.establishments e
  on e.id = f.establishment_id
left join core.districts d
  on d.id = f.district_id
where f.is_current;

create or replace view analytics.dashboard_c3_practices
with (security_invoker = true)
as
select
  f.competency,
  f.district_id,
  f.district_name,
  f.establishment_id,
  f.cnes,
  f.establishment_name,
  f.team_id,
  f.ine,
  f.team_name,
  p.practice_code,
  p.fulfilled,
  f.denominator
from analytics.dashboard_c3_team_monthly f
join analytics.c3_practice_counts p
  on p.fact_id = f.fact_id;

create or replace view analytics.dashboard_competencies
with (security_invoker = true)
as
select
  competency,
  sum(points_total) as points_total,
  sum(denominator) as denominator,
  sum(points_total) / nullif(sum(denominator), 0) as c3
from analytics.c3_team_monthly
where is_current
group by competency;

create or replace view analytics.dashboard_c3_establishment_monthly
with (security_invoker = true)
as
select
  competency,
  district_id,
  district_name,
  establishment_id,
  cnes,
  establishment_name,
  sum(points_total) as points_total,
  sum(denominator) as denominator,
  sum(points_total) / nullif(sum(denominator), 0) as c3,
  count(*) as teams
from analytics.dashboard_c3_team_monthly
group by
  competency,
  district_id,
  district_name,
  establishment_id,
  cnes,
  establishment_name;

create or replace view analytics.dashboard_c3_district_monthly
with (security_invoker = true)
as
select
  competency,
  district_id,
  district_name,
  sum(points_total) as points_total,
  sum(denominator) as denominator,
  sum(points_total) / nullif(sum(denominator), 0) as c3,
  count(distinct establishment_id) as establishments,
  count(*) as teams
from analytics.dashboard_c3_team_monthly
group by competency, district_id, district_name;

create or replace view analytics.dashboard_c3_practice_summary
with (security_invoker = true)
as
select
  competency,
  district_id,
  district_name,
  establishment_id,
  cnes,
  establishment_name,
  practice_code,
  sum(fulfilled) as fulfilled,
  sum(denominator) as denominator
from analytics.dashboard_c3_practices
group by
  competency,
  district_id,
  district_name,
  establishment_id,
  cnes,
  establishment_name,
  practice_code;

grant select on
  analytics.dashboard_team_directory,
  analytics.dashboard_c3_team_monthly,
  analytics.dashboard_c3_practices,
  analytics.dashboard_competencies,
  analytics.dashboard_c3_establishment_monthly,
  analytics.dashboard_c3_district_monthly,
  analytics.dashboard_c3_practice_summary
to authenticated;
