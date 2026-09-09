-- Solicitação pública de Profissional ou Gestão Municipal sem autoelevação.

begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

insert into auth.users (id, email, encrypted_password, aud, role, created_at, updated_at)
values
  ('70000000-0000-0000-0000-000000000001', 'admin@test.local', '', 'authenticated', 'authenticated', now(), now()),
  ('70000000-0000-0000-0000-000000000002', 'gestao@test.local', '', 'authenticated', 'authenticated', now(), now());

update core.profiles
set full_name = 'Admin', completed_at = now(), approval_status = 'aprovado', role = 'administrador'
where user_id = '70000000-0000-0000-0000-000000000001';

select set_config('request.jwt.claim.sub', '70000000-0000-0000-0000-000000000002', true);
set local role authenticated;

select lives_ok(
  $$select security.complete_profile('Gestora Municipal', null, null, 'gestao_municipal')$$,
  'usuário pode solicitar Gestão Municipal'
);
select is(
  (select requested_role from core.profiles where user_id='70000000-0000-0000-0000-000000000002'),
  'gestao_municipal'::core.user_role,
  'solicitação de gestão é armazenada'
);
select is(
  (select role from core.profiles where user_id='70000000-0000-0000-0000-000000000002'),
  'profissional'::core.user_role,
  'solicitação não concede o papel antes da aprovação'
);
select is(
  (select approval_status from core.profiles where user_id='70000000-0000-0000-0000-000000000002'),
  'pendente'::core.approval_status,
  'solicitação continua pendente'
);
select throws_ok(
  $$select security.complete_profile('Gestora Municipal', null, null, 'administrador')$$,
  '22023', 'requested role is not allowed',
  'cadastro público não pode solicitar Administrador'
);

reset role;
select set_config('request.jwt.claim.sub', '70000000-0000-0000-0000-000000000001', true);
set local role authenticated;

select lives_ok(
  $$select security.admin_apply_profile_action('70000000-0000-0000-0000-000000000002','aprovar')$$,
  'Administrador aprova a solicitação'
);
select is(
  (select role from core.profiles where user_id='70000000-0000-0000-0000-000000000002'),
  'gestao_municipal'::core.user_role,
  'aprovação aplica o perfil solicitado atomicamente'
);
select is(
  (select approval_status from core.profiles where user_id='70000000-0000-0000-0000-000000000002'),
  'aprovado'::core.approval_status,
  'perfil fica aprovado'
);

reset role;
select * from finish();
rollback;
