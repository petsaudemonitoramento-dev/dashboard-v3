begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

select has_function('public', 'update_establishment_territory', array['uuid','smallint','date'], 'territory RPC exists');
select has_function('public', 'manage_profile', array['uuid','app.user_role','boolean'], 'profile RPC exists');
select ok(has_function_privilege('authenticated', 'public.update_establishment_territory(uuid,smallint,date)', 'EXECUTE'), 'authenticated can invoke guarded territory RPC');
select ok(not has_function_privilege('anon', 'public.update_establishment_territory(uuid,smallint,date)', 'EXECUTE'), 'anon cannot invoke territory RPC');

insert into auth.users (id, email, encrypted_password, aud, role, created_at, updated_at) values
  ('20000000-0000-0000-0000-000000000001', 'gestao-v1@test.local', '', 'authenticated', 'authenticated', now(), now()),
  ('20000000-0000-0000-0000-000000000002', 'leitura-v1@test.local', '', 'authenticated', 'authenticated', now(), now()),
  ('20000000-0000-0000-0000-000000000003', 'admin-v1@test.local', '', 'authenticated', 'authenticated', now(), now());
insert into app.profiles(user_id,email,role,active) values
  ('20000000-0000-0000-0000-000000000001','gestao-v1@test.local','gestao',true),
  ('20000000-0000-0000-0000-000000000002','leitura-v1@test.local','leitura',true),
  ('20000000-0000-0000-0000-000000000003','admin-v1@test.local','admin',true);
insert into core.districts(id,code,name) values (10,'D10','Distrito Dez'),(11,'D11','Distrito Onze');
insert into core.establishments(id,cnes,name) values ('30000000-0000-0000-0000-000000000001','1234567','UBS Teste');

set local role authenticated;
select set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000002',true);
select throws_ok(
  $$select public.update_establishment_territory('30000000-0000-0000-0000-000000000001',10,'2026-01-01')$$,
  '42501', 'Perfil sem permissão para alterar território', 'leitura cannot change territory'
);

select set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000001',true);
select lives_ok(
  $$select public.update_establishment_territory('30000000-0000-0000-0000-000000000001',10,'2026-01-01')$$,
  'gestao can create territory period'
);
select lives_ok(
  $$select public.update_establishment_territory('30000000-0000-0000-0000-000000000001',11,'2026-04-01')$$,
  'gestao can change territory with a new period'
);
select is((select count(*) from core.establishment_district_history where establishment_id='30000000-0000-0000-0000-000000000001'), 2::bigint, 'territory history is preserved');
select is((select valid_to from core.establishment_district_history where district_id=10), '2026-03-31'::date, 'previous period closes correctly');

select set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000003',true);
select lives_ok(
  $$select public.manage_profile('20000000-0000-0000-0000-000000000002','gestao',true)$$,
  'admin manages profiles'
);
select is((select role::text from app.profiles where user_id='20000000-0000-0000-0000-000000000002'), 'gestao', 'managed role is persisted');

reset role;
insert into siaps.imports(filename,file_sha256,competency,source_status,rows_total)
values ('a.xlsx',repeat('a',64),'2026-01-01','preliminar',1);
select throws_ok(
  $$insert into siaps.imports(filename,file_sha256,competency,source_status,rows_total) values ('b.xlsx',repeat('a',64),'2026-02-01','preliminar',1)$$,
  '23505', null, 'duplicate SHA-256 is rejected'
);

select * from finish();
rollback;
