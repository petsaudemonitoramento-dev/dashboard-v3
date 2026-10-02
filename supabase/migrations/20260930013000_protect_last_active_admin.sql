-- Impede lockout administrativo sem criar novos papéis ou escopo territorial.
-- A serialização cobre apenas chamadas da RPC de perfis, uma operação rara.
create or replace function public.manage_profile(
  p_user_id uuid,
  p_role app.user_role,
  p_active boolean
)
returns app.profiles
language plpgsql
security definer
set search_path = pg_catalog, public, auth, app, audit
as $function$
declare
  v_actor uuid := auth.uid();
  v_email text;
  v_previous app.profiles%rowtype;
  v_result app.profiles%rowtype;
begin
  if not exists (
    select 1 from app.profiles
    where user_id = v_actor and active and role = 'admin'::app.user_role
  ) then
    raise exception 'Apenas administradores ativos podem gerenciar perfis' using errcode = '42501';
  end if;

  -- Duas alterações simultâneas não podem remover administradores diferentes
  -- depois de ambas observarem o outro como ainda ativo.
  perform pg_advisory_xact_lock(hashtextextended('mae_aps.manage_profile', 0));

  if not exists (
    select 1 from app.profiles
    where user_id = v_actor and active and role = 'admin'::app.user_role
  ) then
    raise exception 'Apenas administradores ativos podem gerenciar perfis' using errcode = '42501';
  end if;
  if p_role is null or p_active is null then
    raise exception 'Papel e estado ativo são obrigatórios';
  end if;

  select email into v_email from auth.users where id = p_user_id;
  if v_email is null then
    raise exception 'Usuário autenticado não encontrado';
  end if;

  select * into v_previous
  from app.profiles
  where user_id = p_user_id
  for update;

  if v_previous.user_id is not null
    and v_previous.active
    and v_previous.role = 'admin'::app.user_role
    and (not p_active or p_role <> 'admin'::app.user_role)
    and not exists (
      select 1 from app.profiles
      where user_id <> p_user_id
        and active
        and role = 'admin'::app.user_role
    ) then
    raise exception 'Não é permitido remover o último administrador ativo'
      using errcode = '23514';
  end if;

  insert into app.profiles(user_id, email, role, active)
  values (p_user_id, v_email, p_role, p_active)
  on conflict (user_id) do update
  set email = excluded.email,
      role = excluded.role,
      active = excluded.active,
      updated_at = now()
  returning * into v_result;

  insert into audit.events(actor_user_id, event_type, entity_type, entity_id, metadata)
  values (
    v_actor,
    'profile_access_changed',
    'app.profiles',
    p_user_id::text,
    jsonb_build_object(
      'previous_role', v_previous.role,
      'previous_active', v_previous.active,
      'role', v_result.role,
      'active', v_result.active
    )
  );

  return v_result;
end;
$function$;

revoke all on function public.manage_profile(uuid, app.user_role, boolean) from public, anon;
grant execute on function public.manage_profile(uuid, app.user_role, boolean) to authenticated;
