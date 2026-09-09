-- Correções da auditoria de segurança da Fase 1 (PR #2).
--
-- Esta migration NÃO altera nenhuma das quatro migrations já aplicadas.
-- Ela substitui duas funções por `create or replace`, o que preserva
-- assinatura, privilégios e o histórico aplicado.
--
-- M1 · security.complete_profile
--      Só considerava `deleted_at`. Perfil rejeitado, bloqueado ou inativo
--      continuava reescrevendo os próprios dados cadastrais indefinidamente,
--      poluindo a tela de aprovação do Administrador.
--
-- M2 · security.admin_update_profile
--      Impedia o Administrador de bloquear a si mesmo, mas não de se rebaixar.
--      Com um único Administrador, isso deixava o sistema sem ninguém capaz de
--      aprovar ou promover — e a recuperação exigiria acesso ao SQL Editor,
--      porque `bootstrap_first_administrator` está revogada de `authenticated`.

-- ---------------------------------------------------------------------------
-- M1 · Ciclo de vida do perfil ao completar cadastro
-- ---------------------------------------------------------------------------
-- `pendente` continua podendo completar o cadastro: é o fluxo normal.
-- O que passa a ser recusado é rejeitado, bloqueado, inativo ou excluído.

create or replace function security.complete_profile(
  p_full_name text,
  p_phone text default null,
  p_professional_registration text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  current_profile core.profiles;
begin
  if caller_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if length(trim(p_full_name)) < 3 then
    raise exception 'invalid full name' using errcode = '22023';
  end if;

  select *
  into current_profile
  from core.profiles
  where user_id = caller_id;

  if not found or current_profile.deleted_at is not null then
    raise exception 'profile not found' using errcode = 'P0002';
  end if;

  if current_profile.blocked_at is not null
    or current_profile.is_active = false
    or current_profile.approval_status = 'rejeitado' then
    raise exception 'profile not eligible for completion' using errcode = '42501';
  end if;

  update core.profiles
  set
    full_name = trim(p_full_name),
    phone = nullif(trim(p_phone), ''),
    professional_registration = nullif(trim(p_professional_registration), ''),
    completed_at = coalesce(completed_at, now())
  where user_id = caller_id
    and deleted_at is null;

  if not found then
    raise exception 'profile not found' using errcode = 'P0002';
  end if;
end
$$;

revoke execute on function security.complete_profile(text, text, text)
  from public, anon;
grant execute on function security.complete_profile(text, text, text)
  to authenticated;

-- ---------------------------------------------------------------------------
-- M2 · Invariante: o sistema nunca fica sem Administrador ativo
-- ---------------------------------------------------------------------------

create or replace function security.admin_update_profile(
  p_user_id uuid,
  p_role core.user_role,
  p_approval_status core.approval_status,
  p_is_active boolean,
  p_blocked boolean
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
  if p_user_id = caller_id and (not p_is_active or p_blocked) then
    raise exception 'administrator cannot block own profile' using errcode = '22023';
  end if;

  -- Serializa qualquer decisão que possa alterar o conjunto de
  -- Administradores ativos. Sem isso, dois Administradores simultâneos podem
  -- se rebaixar mutuamente: cada transação veria o outro ainda ativo ao
  -- verificar a invariante, e as duas seriam aprovadas.
  -- A constante é um identificador arbitrário e estável para este lock.
  perform pg_catalog.pg_advisory_xact_lock(4726351001);

  update core.profiles
  set
    role = p_role,
    approval_status = p_approval_status,
    is_active = case when p_blocked then false else p_is_active end,
    approved_at = case
      when p_approval_status = 'aprovado' then coalesce(approved_at, now())
      else null
    end,
    approved_by = case
      when p_approval_status = 'aprovado' then caller_id
      else null
    end,
    blocked_at = case when p_blocked then coalesce(blocked_at, now()) else null end,
    blocked_by = case when p_blocked then caller_id else null end
  where user_id = p_user_id
    and deleted_at is null;

  if not found then
    raise exception 'profile not found' using errcode = 'P0002';
  end if;

  -- Verificação após a mutação, com a mesma definição de "Administrador ativo"
  -- usada por security.is_active_role: o que importa é que continue existindo
  -- alguém capaz de passar pelo guard administrativo. A exceção desfaz o
  -- UPDATE acima junto com a transação.
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

revoke execute on function security.admin_update_profile(
  uuid,
  core.user_role,
  core.approval_status,
  boolean,
  boolean
) from public, anon;
grant execute on function security.admin_update_profile(
  uuid,
  core.user_role,
  core.approval_status,
  boolean,
  boolean
) to authenticated;
