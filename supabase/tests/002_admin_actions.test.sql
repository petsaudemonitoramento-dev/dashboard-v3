-- Marco 1 · security.admin_apply_profile_action
--
-- Exercita cada ação administrativa e as invariantes que o banco precisa
-- sustentar independentemente do que a interface ofereça.

begin;
create extension if not exists pgtap with schema extensions;
select plan(15);

insert into auth.users (id, email, encrypted_password, aud, role, created_at, updated_at)
values
  ('30000000-0000-0000-0000-000000000001', 'admin-a@test.local', '', 'authenticated', 'authenticated', now(), now()),
  ('30000000-0000-0000-0000-000000000002', 'admin-b@test.local', '', 'authenticated', 'authenticated', now(), now()),
  ('30000000-0000-0000-0000-000000000003', 'novo@test.local', '', 'authenticated', 'authenticated', now(), now()),
  ('30000000-0000-0000-0000-000000000004', 'profissional@test.local', '', 'authenticated', 'authenticated', now(), now());

update core.profiles set full_name = 'Admin A', completed_at = now(),
  approval_status = 'aprovado', role = 'administrador'
where user_id = '30000000-0000-0000-0000-000000000001';

update core.profiles set full_name = 'Admin B', completed_at = now(),
  approval_status = 'aprovado', role = 'administrador'
where user_id = '30000000-0000-0000-0000-000000000002';

update core.profiles set full_name = 'Novo Usuario', completed_at = now()
where user_id = '30000000-0000-0000-0000-000000000003';

update core.profiles set full_name = 'Profissional', completed_at = now(),
  approval_status = 'aprovado'
where user_id = '30000000-0000-0000-0000-000000000004';

-- ---------------------------------------------------------------------------
-- Autorização
-- ---------------------------------------------------------------------------

select set_config('request.jwt.claim.sub', '30000000-0000-0000-0000-000000000004', true);
set local role authenticated;
select throws_ok(
  $$select security.admin_apply_profile_action('30000000-0000-0000-0000-000000000003','aprovar')$$,
  '42501', 'administrator required',
  'profissional não executa ação administrativa'
);
reset role;

select set_config('request.jwt.claim.sub', null, true);
set local role authenticated;
select throws_ok(
  $$select security.admin_apply_profile_action('30000000-0000-0000-0000-000000000003','aprovar')$$,
  '42501', 'administrator required',
  'sessão sem usuário não executa ação administrativa'
);
reset role;

-- ---------------------------------------------------------------------------
-- Ciclo de vida completo do usuário novo
-- ---------------------------------------------------------------------------

select set_config('request.jwt.claim.sub', '30000000-0000-0000-0000-000000000001', true);
set local role authenticated;

select lives_ok(
  $$select security.admin_apply_profile_action('30000000-0000-0000-0000-000000000003','aprovar')$$,
  'administrador aprova cadastro pendente'
);
select is(
  (select approval_status from core.profiles where user_id='30000000-0000-0000-0000-000000000003'),
  'aprovado'::core.approval_status,
  'aprovação gravada'
);

select lives_ok(
  $$select security.admin_apply_profile_action('30000000-0000-0000-0000-000000000003','definir_papel','gestao_municipal')$$,
  'administrador define papel de gestão municipal'
);
select is(
  (select role from core.profiles where user_id='30000000-0000-0000-0000-000000000003'),
  'gestao_municipal'::core.user_role,
  'papel gravado'
);

select lives_ok(
  $$select security.admin_apply_profile_action('30000000-0000-0000-0000-000000000003','bloquear')$$,
  'administrador bloqueia usuário'
);
select ok(
  (select blocked_at is not null and is_active = false
     from core.profiles where user_id='30000000-0000-0000-0000-000000000003'),
  'bloqueio marca blocked_at e desativa — respeita profiles_block_state'
);

select lives_ok(
  $$select security.admin_apply_profile_action('30000000-0000-0000-0000-000000000003','desbloquear')$$,
  'administrador desbloqueia usuário'
);
select ok(
  (select blocked_at is null and is_active = true
     from core.profiles where user_id='30000000-0000-0000-0000-000000000003'),
  'desbloqueio limpa blocked_at e reativa'
);

-- ---------------------------------------------------------------------------
-- Entradas inválidas
-- ---------------------------------------------------------------------------

select throws_ok(
  $$select security.admin_apply_profile_action('30000000-0000-0000-0000-000000000003','promover_a_deus')$$,
  '22023', 'unknown administrative action',
  'ação desconhecida é recusada'
);
select throws_ok(
  $$select security.admin_apply_profile_action('30000000-0000-0000-0000-000000000003','definir_papel')$$,
  '22023', 'role is required for this action',
  'definir_papel exige papel'
);

-- ---------------------------------------------------------------------------
-- Invariantes de administrador
-- ---------------------------------------------------------------------------

select throws_ok(
  $$select security.admin_apply_profile_action('30000000-0000-0000-0000-000000000001','bloquear')$$,
  '22023', 'administrator cannot revoke own access',
  'administrador não bloqueia a si mesmo'
);

-- Com dois administradores, rebaixar um é permitido.
select lives_ok(
  $$select security.admin_apply_profile_action('30000000-0000-0000-0000-000000000002','definir_papel','profissional')$$,
  'rebaixar administrador é permitido enquanto outro permanece ativo'
);

-- Agora Admin A é o único. Rebaixá-lo deixaria o sistema sem administrador.
select throws_ok(
  $$select security.admin_apply_profile_action('30000000-0000-0000-0000-000000000001','definir_papel','profissional')$$,
  '23514', 'operation would leave the system without an active administrator',
  'o último administrador ativo não pode ser rebaixado'
);

reset role;

select * from finish();
rollback;
