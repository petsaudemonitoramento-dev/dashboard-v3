-- Marco 1 · Ações administrativas granulares e atômicas.
--
-- `security.admin_update_profile` continua existindo e exige a tupla completa
-- (papel + aprovação + ativo + bloqueado). Para a interface de administração
-- isso obrigaria a aplicação a ler o estado atual e reescrevê-lo por inteiro —
-- um read-modify-write sujeito a corrida, em que dois administradores agindo
-- ao mesmo tempo sobrescrevem a decisão um do outro.
--
-- Esta função aplica UMA operação sobre o estado corrente, dentro da mesma
-- transação, preservando todas as invariantes já estabelecidas:
--   · somente administrador ativo executa;
--   · ninguém se bloqueia, inativa ou rejeita a si mesmo;
--   · o sistema nunca fica sem administrador ativo;
--   · toda alteração privilegiada passa pelo gatilho de auditoria existente.

create or replace function security.admin_apply_profile_action(
  p_user_id uuid,
  p_action text,
  p_role core.user_role default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
begin
  if caller_id is null
    or not security.is_active_role('administrador') then
    raise exception 'administrator required' using errcode = '42501';
  end if;

  if p_action not in (
    'aprovar', 'rejeitar', 'ativar', 'inativar',
    'bloquear', 'desbloquear', 'definir_papel'
  ) then
    raise exception 'unknown administrative action' using errcode = '22023';
  end if;

  if p_action = 'definir_papel' and p_role is null then
    raise exception 'role is required for this action' using errcode = '22023';
  end if;

  -- Operações que retiram o próprio acesso do administrador em exercício.
  if p_user_id = caller_id
    and p_action in ('bloquear', 'inativar', 'rejeitar') then
    raise exception 'administrator cannot revoke own access' using errcode = '22023';
  end if;

  -- Serializa qualquer decisão capaz de alterar o conjunto de administradores
  -- ativos. Mesma constante usada em security.admin_update_profile.
  perform pg_catalog.pg_advisory_xact_lock(4726351001);

  update core.profiles
  set
    approval_status = case
      when p_action = 'aprovar' then 'aprovado'::core.approval_status
      when p_action = 'rejeitar' then 'rejeitado'::core.approval_status
      else approval_status
    end,
    approved_at = case
      when p_action = 'aprovar' then coalesce(approved_at, now())
      when p_action = 'rejeitar' then null
      else approved_at
    end,
    approved_by = case
      when p_action = 'aprovar' then caller_id
      when p_action = 'rejeitar' then null
      else approved_by
    end,
    is_active = case
      when p_action in ('aprovar', 'ativar', 'desbloquear') then true
      when p_action in ('inativar', 'bloquear') then false
      else is_active
    end,
    blocked_at = case
      when p_action = 'bloquear' then coalesce(blocked_at, now())
      when p_action in ('desbloquear', 'ativar') then null
      else blocked_at
    end,
    blocked_by = case
      when p_action = 'bloquear' then caller_id
      when p_action in ('desbloquear', 'ativar') then null
      else blocked_by
    end,
    role = case
      when p_action = 'definir_papel' then p_role
      else role
    end
  where user_id = p_user_id
    and deleted_at is null;

  if not found then
    raise exception 'profile not found' using errcode = 'P0002';
  end if;

  -- Mesma definição de "administrador ativo" usada por security.is_active_role.
  -- A exceção desfaz o UPDATE junto com a transação.
  if not exists (
    select 1
    from core.profiles
    where role = 'administrador'
      and approval_status = 'aprovado'
      and is_active = true
      and completed_at is not null
      and blocked_at is null
      and deleted_at is null
  ) then
    raise exception 'operation would leave the system without an active administrator'
      using errcode = '23514';
  end if;
end
$$;

revoke execute on function security.admin_apply_profile_action(uuid, text, core.user_role)
  from public, anon;
grant execute on function security.admin_apply_profile_action(uuid, text, core.user_role)
  to authenticated;

comment on function security.admin_apply_profile_action is
  'Aplica uma única ação administrativa sobre um perfil, de forma atômica. Revalida o papel do chamador no banco: a checagem na Server Action é defesa em profundidade, não a autoridade.';
