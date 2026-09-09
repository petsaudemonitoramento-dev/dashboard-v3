-- Cadastro público com solicitação explícita de perfil.
--
-- Usuários podem solicitar somente Profissional ou Gestão Municipal. A
-- solicitação NÃO concede privilégio: o papel efetivo continua sem acesso até
-- aprovação administrativa. Administrador nunca é autoatribuível.

begin;

alter table core.profiles
  add column if not exists requested_role core.user_role;

alter table core.profiles
  drop constraint if exists profiles_requested_role_valid;
alter table core.profiles
  add constraint profiles_requested_role_valid check (
    requested_role is null
    or requested_role in (
      'gestao_municipal'::core.user_role,
      'profissional'::core.user_role
    )
  );

create index if not exists profiles_requested_role_idx
  on core.profiles (requested_role)
  where deleted_at is null and requested_role is not null;

comment on column core.profiles.requested_role is
  'Perfil solicitado no cadastro público. Somente profissional ou gestao_municipal; não concede acesso até aprovação administrativa.';

-- Remove a assinatura antiga para evitar sobrecarga ambígua: a nova função
-- mantém compatibilidade porque o quarto argumento possui valor padrão.
drop function if exists security.complete_profile(text, text, text);

create function security.complete_profile(
  p_full_name text,
  p_phone text default null,
  p_professional_registration text default null,
  p_requested_role core.user_role default 'profissional'
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
  if p_requested_role not in (
    'gestao_municipal'::core.user_role,
    'profissional'::core.user_role
  ) then
    raise exception 'requested role is not allowed' using errcode = '22023';
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
    requested_role = case
      when current_profile.approval_status = 'pendente' then p_requested_role
      else requested_role
    end,
    completed_at = coalesce(completed_at, now())
  where user_id = caller_id
    and deleted_at is null;

  if not found then
    raise exception 'profile not found' using errcode = 'P0002';
  end if;
end
$$;

revoke execute on function security.complete_profile(text, text, text, core.user_role)
  from public, anon;
grant execute on function security.complete_profile(text, text, text, core.user_role)
  to authenticated;

-- Aprovar um cadastro pendente aplica atomicamente o perfil solicitado. A
-- coluna role continua sendo a autoridade de acesso e só muda por decisão do
-- Administrador. Perfis antigos sem requested_role preservam o papel atual.
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

  if p_user_id = caller_id
    and p_action in ('bloquear', 'inativar', 'rejeitar') then
    raise exception 'administrator cannot revoke own access' using errcode = '22023';
  end if;

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
      when p_action = 'aprovar' and requested_role is not null then requested_role
      else role
    end
  where user_id = p_user_id
    and deleted_at is null;

  if not found then
    raise exception 'profile not found' using errcode = 'P0002';
  end if;

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

commit;
