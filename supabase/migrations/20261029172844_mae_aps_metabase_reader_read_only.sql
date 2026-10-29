-- Migration aplicada ao Supabase oficial MAE APS em 2026-10-29.
-- Conta de acesso exclusivo para Metabase: sem LOGIN e sem segredo no Git.
-- Ativar LOGIN e definir senha via canal seguro somente ao conectar a instancia.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='mae_metabase_reader') THEN
    CREATE ROLE mae_metabase_reader NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS;
  END IF;
END
$$;
ALTER ROLE mae_metabase_reader SET default_transaction_read_only=on;
ALTER ROLE mae_metabase_reader SET statement_timeout='30s';

REVOKE ALL ON SCHEMA public, app, siaps, audit, study FROM mae_metabase_reader;
GRANT USAGE ON SCHEMA core, analytics TO mae_metabase_reader;
-- Base de views security_invoker: leitura estritamente necessaria para resolver as views.
GRANT SELECT ON core.districts,core.establishments,core.teams,
core.establishment_district_history,core.team_establishment_history,
analytics.c3_team_monthly,analytics.c3_practice_counts TO mae_metabase_reader;
GRANT SELECT ON analytics.dashboard_team_directory,analytics.dashboard_c3_team_monthly,
analytics.dashboard_c3_practices,analytics.dashboard_competencies,
analytics.dashboard_c3_establishment_monthly,analytics.dashboard_c3_district_monthly,
analytics.dashboard_c3_practice_summary TO mae_metabase_reader;

-- RLS explicita para o usuario tecnico, sem alterar as policies dos usuarios MAE APS.
DROP POLICY IF EXISTS c3_monthly_metabase_read ON analytics.c3_team_monthly;
CREATE POLICY c3_monthly_metabase_read ON analytics.c3_team_monthly FOR SELECT TO mae_metabase_reader USING (true);
DROP POLICY IF EXISTS c3_practices_metabase_read ON analytics.c3_practice_counts;
CREATE POLICY c3_practices_metabase_read ON analytics.c3_practice_counts FOR SELECT TO mae_metabase_reader USING (true);
DROP POLICY IF EXISTS districts_metabase_read ON core.districts;
CREATE POLICY districts_metabase_read ON core.districts FOR SELECT TO mae_metabase_reader USING (true);
DROP POLICY IF EXISTS establishments_metabase_read ON core.establishments;
CREATE POLICY establishments_metabase_read ON core.establishments FOR SELECT TO mae_metabase_reader USING (true);
DROP POLICY IF EXISTS teams_metabase_read ON core.teams;
CREATE POLICY teams_metabase_read ON core.teams FOR SELECT TO mae_metabase_reader USING (true);
DROP POLICY IF EXISTS establishment_district_metabase_read ON core.establishment_district_history;
CREATE POLICY establishment_district_metabase_read ON core.establishment_district_history FOR SELECT TO mae_metabase_reader USING (true);
DROP POLICY IF EXISTS team_establishment_metabase_read ON core.team_establishment_history;
CREATE POLICY team_establishment_metabase_read ON core.team_establishment_history FOR SELECT TO mae_metabase_reader USING (true);
