begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

select has_function(
  'public',
  'update_establishment_identity',
  array['uuid','text','text','boolean','boolean'],
  'establishment identity RPC exists'
);
select ok(
  has_function_privilege('authenticated', 'public.update_establishment_identity(uuid,text,text,boolean,boolean)', 'EXECUTE'),
  'authenticated may invoke guarded identity RPC'
);
select ok(
  not has_function_privilege('anon', 'public.update_establishment_identity(uuid,text,text,boolean,boolean)', 'EXECUTE'),
  'anon cannot invoke identity RPC'
);

insert into auth.users (id, email, encrypted_password, aud, role, created_at, updated_at) values
  ('21000000-0000-0000-0000-000000000001', 'admin-identity@test.local', '', 'authenticated', 'authenticated', now(), now()),
  ('21000000-0000-0000-0000-000000000002', 'gestao-identity@test.local', '', 'authenticated', 'authenticated', now(), now()),
  ('21000000-0000-0000-0000-000000000003', 'leitura-identity@test.local', '', 'authenticated', 'authenticated', now(), now()),
  ('21000000-0000-0000-0000-000000000004', 'inactive-admin-identity@test.local', '', 'authenticated', 'authenticated', now(), now());

insert into app.profiles(user_id,email,role,active) values
  ('21000000-0000-0000-0000-000000000001','admin-identity@test.local','admin',true),
  ('21000000-0000-0000-0000-000000000002','gestao-identity@test.local','gestao',true),
  ('21000000-0000-0000-0000-000000000003','leitura-identity@test.local','leitura',true),
  ('21000000-0000-0000-0000-000000000004','inactive-admin-identity@test.local','admin',false);

insert into core.establishments(id,cnes,name) values
  ('31000000-0000-0000-0000-000000000001','1111111','UBS Nome Antigo'),
  ('31000000-0000-0000-0000-000000000002','2222222','UBS Outra');

set local role anon;
select throws_ok(
  $$select public.update_establishment_identity('31000000-0000-0000-0000-000000000001','3333333','UBS Corrigida',true,true)$$,
  '42501',
  'permission denied for function update_establishment_identity',
  'anon is blocked'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','21000000-0000-0000-0000-000000000002',true);
select throws_ok(
  $$select public.update_establishment_identity('31000000-0000-0000-0000-000000000001','3333333','UBS Corrigida',true,true)$$,
  '42501',
  'Apenas administradores ativos podem ajustar nome e CNES',
  'gestao cannot adjust identity'
);

select set_config('request.jwt.claim.sub','21000000-0000-0000-0000-000000000003',true);
select throws_ok(
  $$select public.update_establishment_identity('31000000-0000-0000-0000-000000000001','3333333','UBS Corrigida',true,true)$$,
  '42501',
  'Apenas administradores ativos podem ajustar nome e CNES',
  'leitura cannot adjust identity'
);

select set_config('request.jwt.claim.sub','21000000-0000-0000-0000-000000000004',true);
select throws_ok(
  $$select public.update_establishment_identity('31000000-0000-0000-0000-000000000001','3333333','UBS Corrigida',true,true)$$,
  '42501',
  'Apenas administradores ativos podem ajustar nome e CNES',
  'inactive admin cannot adjust identity'
);

select set_config('request.jwt.claim.sub','21000000-0000-0000-0000-000000000001',true);
select throws_ok(
  $$select public.update_establishment_identity('31000000-0000-0000-0000-000000000001','3333333','UBS Corrigida',false,true)$$,
  '22023',
  'As duas confirmações de segurança são obrigatórias',
  'both confirmations are mandatory'
);
select throws_ok(
  $$select public.update_establishment_identity('31000000-0000-0000-0000-000000000001','123','UBS Corrigida',true,true)$$,
  '22023',
  'CNES deve conter exatamente 7 dígitos',
  'invalid CNES is rejected'
);
select throws_ok(
  $$select public.update_establishment_identity('31000000-0000-0000-0000-000000000001','2222222','UBS Corrigida',true,true)$$,
  '23505',
  'CNES já vinculado a outro estabelecimento',
  'duplicate CNES is rejected'
);
select throws_ok(
  $$select public.update_establishment_identity('31000000-0000-0000-0000-000000000001','3333333','X',true,true)$$,
  '22023',
  'Nome da UBS deve conter entre 3 e 200 caracteres',
  'invalid name is rejected'
);
select lives_ok(
  $$select public.update_establishment_identity('31000000-0000-0000-0000-000000000001','3333333','  UBS   Nome Corrigido  ',true,true)$$,
  'active admin can adjust name and CNES'
);
reset role;

select is(
  (select cnes from core.establishments where id='31000000-0000-0000-0000-000000000001'),
  '3333333',
  'CNES is updated'
);
select is(
  (select name from core.establishments where id='31000000-0000-0000-0000-000000000001'),
  'UBS Nome Corrigido',
  'name is normalized and updated'
);
select is(
  (select count(*) from audit.events where event_type='establishment_identity_changed'),
  1::bigint,
  'identity change is audited once'
);
select is(
  (select metadata->>'previous_cnes' from audit.events where event_type='establishment_identity_changed' order by id desc limit 1),
  '1111111',
  'audit preserves previous CNES'
);

select * from finish();
rollback;
