BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SELECT plan(17);

SELECT ok(EXISTS(SELECT 1 FROM pg_roles WHERE rolname='mae_metabase_reader'),'dedicated metabase role exists');
SELECT ok(NOT (SELECT rolcanlogin FROM pg_roles WHERE rolname='mae_metabase_reader'),'role stays NOLOGIN until secure activation');
SELECT ok(NOT (SELECT rolbypassrls FROM pg_roles WHERE rolname='mae_metabase_reader'),'role cannot bypass RLS');
SELECT ok(NOT (SELECT rolsuper FROM pg_roles WHERE rolname='mae_metabase_reader'),'role is not superuser');
SELECT ok(has_schema_privilege('mae_metabase_reader','analytics','USAGE'),'analytics schema visible');
SELECT ok(has_table_privilege('mae_metabase_reader','analytics.dashboard_competencies','SELECT'),'monthly C3 view readable');
SELECT ok(has_table_privilege('mae_metabase_reader','analytics.dashboard_c3_team_monthly','SELECT'),'team aggregate view readable');
SELECT ok(has_table_privilege('mae_metabase_reader','core.districts','SELECT'),'dimensions available for security_invoker views');
SELECT ok(NOT has_table_privilege('mae_metabase_reader','auth.users','SELECT'),'auth users denied');
SELECT ok(NOT has_table_privilege('mae_metabase_reader','app.profiles','SELECT'),'user profiles denied');
SELECT ok(NOT has_table_privilege('mae_metabase_reader','siaps.imports','SELECT'),'raw import metadata denied');
SELECT ok(NOT has_table_privilege('mae_metabase_reader','audit.events','SELECT'),'audit events denied');
SELECT ok(to_regclass('public.dashboard_competencies') IS NULL OR NOT has_table_privilege('mae_metabase_reader', to_regclass('public.dashboard_competencies'), 'SELECT'),'public API alias absent or denied');
SELECT ok(NOT has_table_privilege('mae_metabase_reader','analytics.c3_team_monthly','UPDATE'),'write operations denied');
SELECT ok(NOT has_schema_privilege('mae_metabase_reader','analytics','CREATE'),'schema modifications denied');
SELECT ok(EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='analytics' AND tablename='c3_team_monthly' AND policyname='c3_monthly_metabase_read' AND cmd='SELECT'),'fact-table RLS explicit');
SELECT ok(EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='core' AND tablename='districts' AND policyname='districts_metabase_read' AND cmd='SELECT'),'dimension RLS explicit');

SELECT * FROM finish();
ROLLBACK;
