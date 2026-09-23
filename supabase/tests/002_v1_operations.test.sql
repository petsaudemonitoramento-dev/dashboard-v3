begin;
create extension if not exists pgtap with schema extensions;
select plan(35);

select has_function('public', 'update_establishment_territory', array['uuid','smallint','date'], 'territory RPC exists');
select has_function('public', 'manage_profile', array['uuid','app.user_role','boolean'], 'profile RPC exists');
select ok(has_function_privilege('authenticated', 'public.update_establishment_territory(uuid,smallint,date)', 'EXECUTE'), 'authenticated may invoke guarded territory RPC');
select ok(not has_function_privilege('anon', 'public.update_establishment_territory(uuid,smallint,date)', 'EXECUTE'), 'anon cannot invoke territory RPC');
select ok(has_function_privilege('authenticated', 'public.manage_profile(uuid,app.user_role,boolean)', 'EXECUTE'), 'authenticated may invoke guarded profile RPC');
select ok(not has_function_privilege('anon', 'public.manage_profile(uuid,app.user_role,boolean)', 'EXECUTE'), 'anon cannot invoke profile RPC');

select is((
  select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname in ('app','core','siaps','analytics','study','audit')
    and c.relkind='r' and not c.relrowsecurity
), 0::bigint, 'RLS remains enabled on every application table');
select ok(not has_table_privilege('authenticated', 'siaps.quality_rows', 'SELECT'), 'raw SIAPS rows are not directly readable');
select ok(not has_schema_privilege('authenticated', 'audit', 'USAGE'), 'audit schema is not exposed to authenticated users');
select is((
  select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname in ('app','core','siaps','analytics','study') and c.relkind='v'
    and not ('security_invoker=true'=any(coalesce(c.reloptions,array[]::text[])))
), 0::bigint, 'all exposed views use security_invoker when present');

insert into auth.users (id, email, encrypted_password, aud, role, created_at, updated_at) values
  ('20000000-0000-0000-0000-000000000001', 'gestao-v1@test.local', '', 'authenticated', 'authenticated', now(), now()),
  ('20000000-0000-0000-0000-000000000002', 'leitura-v1@test.local', '', 'authenticated', 'authenticated', now(), now()),
  ('20000000-0000-0000-0000-000000000003', 'admin-v1@test.local', '', 'authenticated', 'authenticated', now(), now()),
  ('20000000-0000-0000-0000-000000000004', 'inactive-v1@test.local', '', 'authenticated', 'authenticated', now(), now());
insert into app.profiles(user_id,email,role,active) values
  ('20000000-0000-0000-0000-000000000001','gestao-v1@test.local','gestao',true),
  ('20000000-0000-0000-0000-000000000002','leitura-v1@test.local','leitura',true),
  ('20000000-0000-0000-0000-000000000003','admin-v1@test.local','admin',true),
  ('20000000-0000-0000-0000-000000000004','inactive-v1@test.local','admin',false);
insert into core.districts(id,code,name) values (10,'D10','Distrito Dez'),(11,'D11','Distrito Onze');
insert into core.establishments(id,cnes,name) values ('30000000-0000-0000-0000-000000000001','1234567','UBS Teste');

set local role anon;
select throws_ok(
  $$select public.update_establishment_territory('30000000-0000-0000-0000-000000000001'::uuid,10::smallint,'2026-01-01'::date)$$,
  '42501', 'permission denied for function update_establishment_territory', 'anon is blocked from territory RPC'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000004',true);
select throws_ok(
  $$select public.update_establishment_territory('30000000-0000-0000-0000-000000000001'::uuid,10::smallint,'2026-01-01'::date)$$,
  '42501', 'Perfil sem permissão para alterar território', 'inactive user cannot change territory'
);
select set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000002',true);
select throws_ok(
  $$select public.update_establishment_territory('30000000-0000-0000-0000-000000000001'::uuid,10::smallint,'2026-01-01'::date)$$,
  '42501', 'Perfil sem permissão para alterar território', 'leitura cannot change territory'
);
select set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000001',true);
select throws_ok(
  $$select public.update_establishment_territory('30000000-0000-0000-0000-000000000001'::uuid,10::smallint,null::date)$$,
  'P0001', 'Data inicial de validade obrigatória', 'null validity date is rejected'
);
select throws_ok(
  $$select public.update_establishment_territory('30000000-0000-0000-0000-000000000099'::uuid,10::smallint,'2026-01-01'::date)$$,
  'P0001', 'Estabelecimento não encontrado', 'unknown establishment is rejected'
);
select throws_ok(
  $$select public.update_establishment_territory('30000000-0000-0000-0000-000000000001'::uuid,99::smallint,'2026-01-01'::date)$$,
  'P0001', 'Distrito ativo não encontrado', 'unknown district is rejected'
);
select lives_ok(
  $$select public.update_establishment_territory('30000000-0000-0000-0000-000000000001'::uuid,10::smallint,'2026-01-01'::date)$$,
  'gestao can create territory period'
);
select set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000003',true);
select lives_ok(
  $$select public.update_establishment_territory('30000000-0000-0000-0000-000000000001'::uuid,11::smallint,'2026-04-01'::date)$$,
  'admin can change territory with a new period'
);
select set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000001',true);
select lives_ok(
  $$select public.update_establishment_territory('30000000-0000-0000-0000-000000000001'::uuid,null::smallint,'2026-07-01'::date)$$,
  'gestao can end a territory assignment as unknown'
);
reset role;

select is((select count(*) from core.establishment_district_history where establishment_id='30000000-0000-0000-0000-000000000001'), 2::bigint, 'territory history is preserved');
select is((select valid_to from core.establishment_district_history where district_id=10), '2026-03-31'::date, 'first period closes correctly');
select is((select valid_to from core.establishment_district_history where district_id=11), '2026-06-30'::date, 'second period closes correctly');
select is((select count(*) from core.establishment_district_history where establishment_id='30000000-0000-0000-0000-000000000001' and valid_to is null), 0::bigint, 'unknown territory has no current inferred district');
select is((
  select count(*) from core.establishment_district_history a
  join core.establishment_district_history b on a.establishment_id=b.establishment_id and a.id<b.id
  where daterange(a.valid_from,coalesce(a.valid_to,'infinity'::date),'[]') && daterange(b.valid_from,coalesce(b.valid_to,'infinity'::date),'[]')
), 0::bigint, 'territory periods never overlap');
select is((select count(*) from audit.events where event_type='territory_assignment_changed'), 3::bigint, 'territory changes are audited');

set local role authenticated;
select set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000001',true);
select throws_ok(
  $$select public.update_establishment_territory('30000000-0000-0000-0000-000000000001'::uuid,10::smallint,'2026-05-01'::date)$$,
  'P0001', 'A nova vigência não pode sobrepor período territorial existente', 'past assignment cannot overlap preserved history'
);
reset role;

set local role anon;
select throws_ok(
  $$select public.manage_profile('20000000-0000-0000-0000-000000000002','gestao',true)$$,
  '42501', 'permission denied for function manage_profile', 'anon is blocked from profile RPC'
);
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000001',true);
select throws_ok(
  $$select public.manage_profile('20000000-0000-0000-0000-000000000002','gestao',true)$$,
  '42501', 'Apenas administradores ativos podem gerenciar perfis', 'gestao cannot manage profiles'
);
select set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000002',true);
select throws_ok(
  $$select public.manage_profile('20000000-0000-0000-0000-000000000001','leitura',true)$$,
  '42501', 'Apenas administradores ativos podem gerenciar perfis', 'leitura cannot manage profiles'
);
select set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000004',true);
select throws_ok(
  $$select public.manage_profile('20000000-0000-0000-0000-000000000002','gestao',true)$$,
  '42501', 'Apenas administradores ativos podem gerenciar perfis', 'inactive admin cannot manage profiles'
);
select set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000003',true);
select lives_ok(
  $$select public.manage_profile('20000000-0000-0000-0000-000000000002','gestao',true)$$,
  'active admin manages profiles'
);
reset role;
select is((select role::text from app.profiles where user_id='20000000-0000-0000-0000-000000000002'), 'gestao', 'managed role is persisted');
select is((select count(*) from audit.events where event_type='profile_access_changed'), 1::bigint, 'profile change is audited');
set local role authenticated;
select set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000003',true);
select throws_ok(
  $$select public.manage_profile('20000000-0000-0000-0000-000000000099','leitura',true)$$,
  'P0001', 'Usuário autenticado não encontrado', 'unknown auth user is rejected'
);
reset role;

insert into siaps.imports(filename,file_sha256,competency,source_status,rows_total)
values ('a.xlsx',repeat('a',64),'2026-01-01','preliminar',1);
select throws_ok(
  $$insert into siaps.imports(filename,file_sha256,competency,source_status,rows_total) values ('b.xlsx',repeat('a',64),'2026-02-01','preliminar',1)$$,
  '23505', null, 'duplicate SHA-256 is rejected'
);

select * from finish();
rollback;
