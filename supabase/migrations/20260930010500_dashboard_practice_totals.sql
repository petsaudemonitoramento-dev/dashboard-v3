-- Agrega somente os componentes A-K do recorte solicitado. A função evita o
-- limite de 1.000 linhas do PostgREST sem ampliar o acesso territorial: a RLS
-- das tabelas de origem continua sendo aplicada ao invocador.
create or replace function analytics.dashboard_c3_practice_totals(
  p_competency date,
  p_district_id smallint,
  p_without_district boolean,
  p_establishment_id uuid,
  p_team_id uuid
)
returns table(practice_code text, fulfilled bigint)
language sql
stable
security invoker
set search_path = ''
as $function$
  select p.practice_code::text, sum(p.fulfilled)::bigint
  from analytics.c3_team_monthly f
  join analytics.c3_practice_counts p on p.fact_id = f.id
  where f.is_current
    and f.competency = p_competency
    and (
      (p_without_district and p_district_id is null and f.district_id is null)
      or (
        not p_without_district
        and (p_district_id is null or f.district_id = p_district_id)
      )
    )
    and (p_establishment_id is null or f.establishment_id = p_establishment_id)
    and (p_team_id is null or f.team_id = p_team_id)
  group by p.practice_code
  order by p.practice_code;
$function$;

revoke all on function analytics.dashboard_c3_practice_totals(date,smallint,boolean,uuid,uuid)
  from public, anon;
grant execute on function analytics.dashboard_c3_practice_totals(date,smallint,boolean,uuid,uuid)
  to authenticated;

comment on function analytics.dashboard_c3_practice_totals(date,smallint,boolean,uuid,uuid)
  is 'Totais A-K do dashboard no recorte municipal, distrital, UBS ou equipe; respeita a RLS do invocador.';
