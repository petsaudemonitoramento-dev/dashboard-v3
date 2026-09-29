-- Hardening final da V1.0.0. Migration incremental e não destrutiva.

create or replace function public.update_establishment_territory(
  p_establishment_id uuid,
  p_district_id smallint,
  p_valid_from date
)
returns bigint
language plpgsql
security definer
set search_path = pg_catalog, public, app, core, analytics, audit
as $function$
declare
  v_actor uuid := auth.uid();
  v_previous core.establishment_district_history%rowtype;
  v_history_id bigint;
  v_latest_valid_from date;
begin
  if not exists (
    select 1 from app.profiles
    where user_id = v_actor and active and role = 'admin'::app.user_role
  ) then
    raise exception 'Apenas administradores ativos podem alterar território' using errcode = '42501';
  end if;
  if p_valid_from is null then raise exception 'Data inicial de validade obrigatória'; end if;
  if not exists (select 1 from core.establishments where id = p_establishment_id) then
    raise exception 'Estabelecimento não encontrado';
  end if;
  if p_district_id is not null and not exists (
    select 1 from core.districts where id = p_district_id and active
  ) then
    raise exception 'Distrito ativo não encontrado';
  end if;

  select * into v_previous
  from core.establishment_district_history
  where establishment_id = p_establishment_id and valid_to is null
  order by valid_from desc limit 1 for update;

  select max(valid_from) into v_latest_valid_from
  from core.establishment_district_history where establishment_id = p_establishment_id;
  if v_latest_valid_from is not null and v_latest_valid_from >= p_valid_from then
    raise exception 'A nova vigência deve começar depois de %', v_latest_valid_from;
  end if;
  if v_previous.id is null and exists (
    select 1 from core.establishment_district_history
    where establishment_id = p_establishment_id and valid_to is not null and valid_to >= p_valid_from
  ) then
    raise exception 'A nova vigência não pode sobrepor período territorial existente';
  end if;
  if v_previous.id is not null and v_previous.district_id is not distinct from p_district_id then
    return v_previous.id;
  end if;
  if v_previous.id is not null then
    update core.establishment_district_history set valid_to = p_valid_from - 1 where id = v_previous.id;
  end if;
  if p_district_id is not null then
    insert into core.establishment_district_history(establishment_id,district_id,valid_from,source,notes)
    values (p_establishment_id,p_district_id,p_valid_from,'manual','Atualização administrativa no MAE APS')
    returning id into v_history_id;
  end if;
  update analytics.c3_team_monthly set district_id = p_district_id
  where establishment_id = p_establishment_id
    and competency >= date_trunc('month', p_valid_from)::date;
  insert into audit.events(actor_user_id,event_type,entity_type,entity_id,metadata)
  values (v_actor,'territory_assignment_changed','core.establishments',p_establishment_id::text,
    jsonb_build_object('previous_district_id',v_previous.district_id,'district_id',p_district_id,
      'valid_from',p_valid_from,'history_id',v_history_id));
  return coalesce(v_history_id, v_previous.id);
end;
$function$;

create or replace function public.update_establishment_identity(
  p_establishment_id uuid,
  p_name text,
  p_cnes text
)
returns core.establishments
language plpgsql
security definer
set search_path = pg_catalog, public, app, core, audit
as $function$
declare
  v_actor uuid := auth.uid();
  v_previous core.establishments%rowtype;
  v_result core.establishments%rowtype;
begin
  if not exists (
    select 1 from app.profiles
    where user_id = v_actor and active and role = 'admin'::app.user_role
  ) then
    raise exception 'Apenas administradores ativos podem alterar a identidade da UBS' using errcode = '42501';
  end if;
  if p_cnes !~ '^[0-9]{7}$' then raise exception 'CNES deve conter exatamente 7 dígitos'; end if;
  if length(trim(coalesce(p_name,''))) < 2 or length(trim(p_name)) > 160 then raise exception 'Nome da UBS inválido'; end if;
  select * into v_previous from core.establishments where id = p_establishment_id for update;
  if v_previous.id is null then raise exception 'Estabelecimento não encontrado'; end if;
  if exists (select 1 from core.establishments where cnes = p_cnes and id <> p_establishment_id) then
    raise exception 'CNES já vinculado a outra UBS';
  end if;
  update core.establishments set name = trim(p_name), cnes = p_cnes
  where id = p_establishment_id returning * into v_result;
  insert into audit.events(actor_user_id,event_type,entity_type,entity_id,metadata)
  values (v_actor,'establishment_identity_changed','core.establishments',p_establishment_id::text,
    jsonb_build_object('previous_name',v_previous.name,'previous_cnes',v_previous.cnes,
      'name',v_result.name,'cnes',v_result.cnes));
  return v_result;
end;
$function$;

revoke all on function public.update_establishment_identity(uuid,text,text) from public, anon;
grant execute on function public.update_establishment_identity(uuid,text,text) to authenticated;

-- Único ponto privilegiado de publicação. Valida novamente o payload que veio
-- do navegador e chama a ingestão existente na mesma transação PostgreSQL.
create or replace function public.publish_siaps_c3_v1(p_metadata jsonb, p_rows jsonb)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, app, core, siaps, analytics, audit
as $function$
declare
  v_actor uuid;
  v_filename text;
  v_count integer;
begin
  if jsonb_typeof(p_metadata) <> 'object' or jsonb_typeof(p_rows) <> 'array' then
    raise exception 'Payload SIAPS inválido';
  end if;
  v_actor := nullif(p_metadata->>'uploaded_by','')::uuid;
  if not exists (
    select 1 from app.profiles
    where user_id = v_actor and active and role = 'gestao'::app.user_role
  ) then
    raise exception 'Apenas a Gestão ativa pode importar dados' using errcode = '42501';
  end if;
  v_filename := p_metadata->>'filename';
  if v_filename is null or length(v_filename) > 255
     or lower(right(v_filename,5)) <> '.xlsx'
     or position('/' in v_filename) > 0 or position(chr(92) in v_filename) > 0 then
    raise exception 'Nome de arquivo inválido';
  end if;
  if (p_metadata->>'file_sha256') !~ '^[a-f0-9]{64}$' then raise exception 'SHA-256 inválido'; end if;
  v_count := jsonb_array_length(p_rows);
  if v_count < 1 or v_count > 10000 or coalesce((p_metadata->>'rows_total')::integer,-1) <> v_count then
    raise exception 'Quantidade de linhas inválida';
  end if;
  if exists (select 1 from jsonb_array_elements(p_rows) r where jsonb_typeof(r) <> 'array') then
    raise exception 'Linha SIAPS inválida';
  end if;
  if exists (select 1 from jsonb_array_elements(p_rows) r where jsonb_array_length(r) <> 21) then
    raise exception 'Linha SIAPS deve conter 21 campos';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_rows) r
    where (r->>0) !~ '^[1-9][0-9]*$'
       or (r->>1) !~ '^[0-9]{7}$'
       or (r->>4) !~ '^[0-9]{10}$'
       or (r->>7) !~ '^[0-9]+$' or (r->>8) !~ '^[0-9]+$' or (r->>9) !~ '^[0-9]+$'
       or (r->>10) !~ '^[0-9]+$' or (r->>11) !~ '^[0-9]+$' or (r->>12) !~ '^[0-9]+$'
       or (r->>13) !~ '^[0-9]+$' or (r->>14) !~ '^[0-9]+$' or (r->>15) !~ '^[0-9]+$'
       or (r->>16) !~ '^[0-9]+$' or (r->>17) !~ '^[0-9]+$'
       or (r->>18) !~ '^[0-9]+([.][0-9]+)?$' or (r->>19) !~ '^[0-9]+$'
  ) then raise exception 'Identificadores ou medidas SIAPS inválidos'; end if;
  if exists (
    select 1 from jsonb_array_elements(p_rows) r
    where (r->>7)::integer > (r->>19)::integer or (r->>8)::integer > (r->>19)::integer
       or (r->>9)::integer > (r->>19)::integer or (r->>10)::integer > (r->>19)::integer
       or (r->>11)::integer > (r->>19)::integer or (r->>12)::integer > (r->>19)::integer
       or (r->>13)::integer > (r->>19)::integer or (r->>14)::integer > (r->>19)::integer
       or (r->>15)::integer > (r->>19)::integer or (r->>16)::integer > (r->>19)::integer
       or (r->>17)::integer > (r->>19)::integer
       or (r->>18)::numeric <> 10*(r->>7)::numeric + 9*((r->>8)::numeric+(r->>9)::numeric+
          (r->>10)::numeric+(r->>11)::numeric+(r->>12)::numeric+(r->>13)::numeric+
          (r->>14)::numeric+(r->>15)::numeric+(r->>16)::numeric+(r->>17)::numeric)
       or ((r->20) <> 'null'::jsonb and ((r->>20) !~ '^[0-9]+([.][0-9]+)?$'
          or (r->>20)::numeric < 0 or (r->>20)::numeric > 100))
  ) then raise exception 'Medidas C3 inconsistentes'; end if;
  if exists (
    select 1 from jsonb_array_elements(p_rows) r group by r->>0 having count(*) > 1
  ) or exists (
    select 1 from jsonb_array_elements(p_rows) r group by r->>4 having count(*) > 1
  ) then raise exception 'Linha ou INE duplicado no arquivo'; end if;
  return public.ingest_siaps_c3_compact(p_metadata, p_rows);
end;
$function$;

revoke execute on function public.ingest_siaps_c3(jsonb,jsonb) from service_role;
revoke execute on function public.stage_siaps_c3_compact(jsonb,jsonb,boolean) from service_role;
revoke execute on function public.ingest_siaps_c3_compact(jsonb,jsonb) from service_role;
revoke all on function public.publish_siaps_c3_v1(jsonb,jsonb) from public, anon, authenticated;
grant execute on function public.publish_siaps_c3_v1(jsonb,jsonb) to service_role;

-- RLS por responsabilidade institucional, não apenas por autenticação.
drop policy if exists c3_practices_active_users_read on analytics.c3_practice_counts;
create policy c3_practices_dashboard_read on analytics.c3_practice_counts for select to authenticated
using (exists (select 1 from app.profiles p where p.user_id = (select auth.uid()) and p.active and p.role in ('gestao','leitura')));
drop policy if exists c3_monthly_active_users_read on analytics.c3_team_monthly;
create policy c3_monthly_dashboard_read on analytics.c3_team_monthly for select to authenticated
using (exists (select 1 from app.profiles p where p.user_id = (select auth.uid()) and p.active and p.role in ('gestao','leitura')));
drop policy if exists imports_active_users_read on siaps.imports;
create policy imports_gestao_read on siaps.imports for select to authenticated
using (exists (select 1 from app.profiles p where p.user_id = (select auth.uid()) and p.active and p.role = 'gestao'));
drop policy if exists cohort_members_active_users_read on study.cohort_members;
drop policy if exists cohorts_active_users_read on study.cohorts;
revoke select on study.cohort_members, study.cohorts from authenticated;
revoke usage on schema study from authenticated;

create or replace view analytics.dashboard_team_directory
with (security_invoker = true)
as
select t.id as team_id, t.ine, t.name as team_name, t.team_type,
  e.id as establishment_id, e.cnes, e.name as establishment_name,
  d.id as district_id, d.name as district_name
from core.teams t
left join core.team_establishment_history teh on teh.team_id=t.id and teh.valid_to is null
left join core.establishments e on e.id=teh.establishment_id
left join core.establishment_district_history edh on edh.establishment_id=e.id and edh.valid_to is null
left join core.districts d on d.id=edh.district_id
where t.active;

create or replace view analytics.dashboard_c3_team_monthly
with (security_invoker = true)
as
select f.id as fact_id, f.competency, f.district_id, d.name as district_name,
  f.establishment_id, e.cnes, e.name as establishment_name,
  f.team_id, t.ine, t.name as team_name,
  f.denominator, f.points_total,
  f.points_total / nullif(f.denominator,0) as c3,
  case when f.denominator=0 then 'Sem população elegível'
       when f.points_total/nullif(f.denominator,0) < 0 or f.points_total/nullif(f.denominator,0) > 100 then 'Valor inválido'
       when f.points_total/nullif(f.denominator,0)>75 then 'Ótimo'
       when f.points_total/nullif(f.denominator,0)>50 then 'Bom'
       when f.points_total/nullif(f.denominator,0)>25 then 'Suficiente'
       else 'Regular' end as classification
from analytics.c3_team_monthly f
join core.teams t on t.id=f.team_id
join core.establishments e on e.id=f.establishment_id
left join core.districts d on d.id=f.district_id
where f.is_current;

create or replace view analytics.dashboard_c3_practices
with (security_invoker = true)
as
select f.competency, f.district_id, f.district_name, f.establishment_id, f.cnes,
  f.establishment_name, f.team_id, f.ine, f.team_name,
  p.practice_code, p.fulfilled, f.denominator
from analytics.dashboard_c3_team_monthly f
join analytics.c3_practice_counts p on p.fact_id=f.fact_id;

create or replace view analytics.dashboard_competencies
with (security_invoker = true)
as
select competency, sum(points_total) as points_total, sum(denominator) as denominator,
  sum(points_total)/nullif(sum(denominator),0) as c3
from analytics.c3_team_monthly where is_current group by competency;

create or replace view analytics.dashboard_c3_establishment_monthly
with (security_invoker = true)
as
select competency, district_id, district_name, establishment_id, cnes, establishment_name,
  sum(points_total) as points_total, sum(denominator) as denominator,
  sum(points_total)/nullif(sum(denominator),0) as c3, count(*) as teams
from analytics.dashboard_c3_team_monthly
group by competency,district_id,district_name,establishment_id,cnes,establishment_name;

create or replace view analytics.dashboard_c3_district_monthly
with (security_invoker = true)
as
select competency, district_id, district_name,
  sum(points_total) as points_total, sum(denominator) as denominator,
  sum(points_total)/nullif(sum(denominator),0) as c3,
  count(distinct establishment_id) as establishments, count(*) as teams
from analytics.dashboard_c3_team_monthly group by competency,district_id,district_name;

create or replace view analytics.dashboard_c3_practice_summary
with (security_invoker = true)
as
select competency,district_id,district_name,establishment_id,cnes,establishment_name,
  practice_code,sum(fulfilled) as fulfilled,sum(denominator) as denominator
from analytics.dashboard_c3_practices
group by competency,district_id,district_name,establishment_id,cnes,establishment_name,practice_code;

grant select on analytics.dashboard_team_directory, analytics.dashboard_c3_team_monthly,
  analytics.dashboard_c3_practices, analytics.dashboard_competencies,
  analytics.dashboard_c3_establishment_monthly, analytics.dashboard_c3_district_monthly,
  analytics.dashboard_c3_practice_summary to authenticated;
