-- TEMPLATE FUTURO: revisar e executar manualmente como administrador do banco.
-- Não contém LOGIN, senha ou connection string.
do $block$
begin
  if not exists (select 1 from pg_roles where rolname = 'mae_metabase_reader') then
    create role mae_metabase_reader nologin nosuperuser nocreatedb nocreaterole noinherit;
  end if;
end
$block$;

revoke all on schema public, app, siaps, audit, study from mae_metabase_reader;
grant usage on schema core, analytics to mae_metabase_reader;

grant select on core.districts, core.establishments, core.teams,
  core.establishment_district_history, core.team_establishment_history,
  analytics.c3_team_monthly, analytics.c3_practice_counts
to mae_metabase_reader;

grant select on analytics.dashboard_team_directory,
  analytics.dashboard_c3_team_monthly, analytics.dashboard_c3_practices,
  analytics.dashboard_competencies, analytics.dashboard_c3_establishment_monthly,
  analytics.dashboard_c3_district_monthly, analytics.dashboard_c3_practice_summary
to mae_metabase_reader;

drop policy if exists c3_monthly_metabase_read on analytics.c3_team_monthly;
create policy c3_monthly_metabase_read on analytics.c3_team_monthly
  for select to mae_metabase_reader using (true);
drop policy if exists c3_practices_metabase_read on analytics.c3_practice_counts;
create policy c3_practices_metabase_read on analytics.c3_practice_counts
  for select to mae_metabase_reader using (true);
drop policy if exists districts_metabase_read on core.districts;
create policy districts_metabase_read on core.districts
  for select to mae_metabase_reader using (true);
drop policy if exists establishments_metabase_read on core.establishments;
create policy establishments_metabase_read on core.establishments
  for select to mae_metabase_reader using (true);
drop policy if exists teams_metabase_read on core.teams;
create policy teams_metabase_read on core.teams
  for select to mae_metabase_reader using (true);
drop policy if exists establishment_district_metabase_read on core.establishment_district_history;
create policy establishment_district_metabase_read on core.establishment_district_history
  for select to mae_metabase_reader using (true);
drop policy if exists team_establishment_metabase_read on core.team_establishment_history;
create policy team_establishment_metabase_read on core.team_establishment_history
  for select to mae_metabase_reader using (true);
