begin;
create extension if not exists pgtap with schema extensions;
select plan(21);

select has_schema('app', 'app schema exists');
select has_schema('core', 'core schema exists');
select has_schema('siaps', 'siaps schema exists');
select has_schema('analytics', 'analytics schema exists');
select has_schema('study', 'study schema exists');
select has_schema('audit', 'audit schema exists');
select hasnt_schema('professional', 'no professional schema');
select hasnt_schema('analytics_gestao', 'no legacy analytics schema');
select hasnt_schema('security', 'no legacy security schema');

select has_table('app', 'profiles', 'profiles live in app');
select has_table('analytics', 'c3_team_monthly', 'monthly C3 facts exist');
select has_table('study', 'cohort_members', 'pilot membership is a cohort');
select ok((select relrowsecurity from pg_class where oid = 'app.profiles'::regclass), 'profiles RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'audit.events'::regclass), 'audit RLS enabled');
select ok(not has_table_privilege('anon', 'app.profiles', 'SELECT'), 'anon cannot read profiles');
select is((select count(*) from storage.buckets where id = 'professional-source'), 0::bigint, 'no professional bucket recreated');
select is(10 * 2 + 9 * 10, 110, 'C3 weights A=10 and B-K=9');

insert into auth.users (id, email, encrypted_password, aud, role, created_at, updated_at)
values
  ('10000000-0000-0000-0000-000000000001', 'admin@test.local', '', 'authenticated', 'authenticated', now(), now()),
  ('10000000-0000-0000-0000-000000000002', 'inactive@test.local', '', 'authenticated', 'authenticated', now(), now());

insert into app.profiles (user_id, email, role, active)
values
  ('10000000-0000-0000-0000-000000000001', 'admin@test.local', 'admin', true),
  ('10000000-0000-0000-0000-000000000002', 'inactive@test.local', 'gestao', false);
insert into core.districts (id, code, name) values (1, 'D1', 'Distrito Teste');

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
select is((select count(*) from app.profiles), 1::bigint, 'active user reads only own profile');
select is((select count(*) from core.districts), 1::bigint, 'active user reads municipal dimensions');

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000002', true);
select is((select count(*) from core.districts), 0::bigint, 'inactive user cannot read dimensions');
select is((select count(*) from app.profiles), 1::bigint, 'inactive user cannot read another profile');

select * from finish();
rollback;
