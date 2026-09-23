-- V3 authorization: server-verifiable profile state, controlled mutations and RLS.

create or replace function security.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end
$$;

revoke execute on function security.set_updated_at() from public, anon, authenticated;

drop trigger if exists profiles_set_updated_at on core.profiles;
create trigger profiles_set_updated_at
before update on core.profiles
for each row execute function security.set_updated_at();

drop trigger if exists patients_set_updated_at on professional.patients;
create trigger patients_set_updated_at
before update on professional.patients
for each row execute function security.set_updated_at();

create or replace function security.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into core.profiles (user_id, email, role)
  values (new.id, coalesce(new.email, ''), 'profissional')
  on conflict (user_id) do update set email = excluded.email;
  return new;
end
$$;

revoke execute on function security.handle_new_auth_user()
  from public, anon, authenticated;

drop trigger if exists on_auth_user_created_v3 on auth.users;
create trigger on_auth_user_created_v3
after insert on auth.users
for each row execute function security.handle_new_auth_user();

create or replace function security.handle_auth_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update core.profiles
  set email = coalesce(new.email, email)
  where user_id = new.id;
  return new;
end
$$;

revoke execute on function security.handle_auth_user_email_change()
  from public, anon, authenticated;

drop trigger if exists on_auth_user_email_changed_v3 on auth.users;
create trigger on_auth_user_email_changed_v3
after update of email on auth.users
for each row
when (old.email is distinct from new.email)
execute function security.handle_auth_user_email_change();

create or replace function security.is_active_role(required_role core.user_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select auth.uid()) is not null
    and exists (
      select 1
      from core.profiles p
      where p.user_id = (select auth.uid())
        and p.role = required_role
        and p.is_active = true
        and p.completed_at is not null
        and p.approval_status = 'aprovado'
        and p.blocked_at is null
        and p.deleted_at is null
    )
$$;

revoke execute on function security.is_active_role(core.user_role)
  from public, anon;
grant execute on function security.is_active_role(core.user_role)
  to authenticated;

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
begin
  if caller_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if length(trim(p_full_name)) < 3 then
    raise exception 'invalid full name' using errcode = '22023';
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

create or replace function security.audit_profile_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  action_name text;
begin
  if old.role is not distinct from new.role
    and old.approval_status is not distinct from new.approval_status
    and old.is_active is not distinct from new.is_active
    and old.blocked_at is not distinct from new.blocked_at
    and old.deleted_at is not distinct from new.deleted_at then
    return new;
  end if;

  action_name := case
    when old.deleted_at is null and new.deleted_at is not null then 'profile.deleted'
    when old.blocked_at is null and new.blocked_at is not null then 'profile.blocked'
    when old.blocked_at is not null and new.blocked_at is null then 'profile.unblocked'
    when old.approval_status is distinct from new.approval_status then 'profile.approval_changed'
    when old.role is distinct from new.role then 'profile.role_changed'
    else 'profile.access_changed'
  end;

  insert into audit.events (
    actor_user_id,
    action,
    target_type,
    target_id,
    metadata
  )
  values (
    (select auth.uid()),
    action_name,
    'core.profile',
    new.user_id::text,
    jsonb_build_object(
      'old_role', old.role,
      'new_role', new.role,
      'old_approval_status', old.approval_status,
      'new_approval_status', new.approval_status,
      'old_is_active', old.is_active,
      'new_is_active', new.is_active,
      'blocked', new.blocked_at is not null,
      'deleted', new.deleted_at is not null
    )
  );
  return new;
end
$$;

revoke execute on function security.audit_profile_change()
  from public, anon, authenticated;

drop trigger if exists profiles_audit_privileged_changes on core.profiles;
create trigger profiles_audit_privileged_changes
after update on core.profiles
for each row execute function security.audit_profile_change();

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

create or replace function security.bootstrap_first_administrator(p_email text)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  selected_user_id uuid;
begin
  if exists (
    select 1
    from core.profiles
    where role = 'administrador'
      and approval_status = 'aprovado'
      and is_active = true
      and blocked_at is null
      and deleted_at is null
  ) then
    raise exception 'an active administrator already exists' using errcode = '23505';
  end if;

  select user_id
  into selected_user_id
  from core.profiles
  where lower(email) = lower(trim(p_email))
    and completed_at is not null
    and deleted_at is null
  for update;

  if selected_user_id is null then
    raise exception 'completed profile not found' using errcode = 'P0002';
  end if;

  update core.profiles
  set
    role = 'administrador',
    approval_status = 'aprovado',
    is_active = true,
    approved_at = now(),
    approved_by = selected_user_id,
    blocked_at = null,
    blocked_by = null
  where user_id = selected_user_id;

  insert into audit.events (
    actor_user_id,
    action,
    target_type,
    target_id,
    metadata
  )
  values (
    selected_user_id,
    'profile.bootstrap_administrator',
    'core.profile',
    selected_user_id::text,
       jsonb_build_object('method', 'trusted_sql')
  );

  return selected_user_id;
end
$$;

revoke execute on function security.bootstrap_first_administrator(text)
  from public, anon, authenticated;

grant select on core.profiles to authenticated;
grant usage on schema professional, analytics_gestao to authenticated;
grant select, insert, update, delete on professional.patients to authenticated;
grant usage, select on sequence professional.patients_id_seq to authenticated;
grant select on analytics_gestao.published_competencies to authenticated;

drop policy if exists profiles_select_own on core.profiles;
create policy profiles_select_own
on core.profiles for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists profiles_select_administrator on core.profiles;
create policy profiles_select_administrator
on core.profiles for select
to authenticated
using ((select security.is_active_role('administrador')));

drop policy if exists patients_select_owner on professional.patients;
create policy patients_select_owner
on professional.patients for select
to authenticated
using (
  (select auth.uid()) = owner_user_id
  and (select security.is_active_role('profissional'))
);

drop policy if exists patients_insert_owner on professional.patients;
create policy patients_insert_owner
on professional.patients for insert
to authenticated
with check (
  (select auth.uid()) = owner_user_id
  and (select security.is_active_role('profissional'))
);

drop policy if exists patients_update_owner on professional.patients;
create policy patients_update_owner
on professional.patients for update
to authenticated
using (
  (select auth.uid()) = owner_user_id
  and (select security.is_active_role('profissional'))
)
with check (
  (select auth.uid()) = owner_user_id
  and (select security.is_active_role('profissional'))
);

drop policy if exists patients_delete_owner on professional.patients;
create policy patients_delete_owner
on professional.patients for delete
to authenticated
using (
  (select auth.uid()) = owner_user_id
  and (select security.is_active_role('profissional'))
);

drop policy if exists published_competencies_select_management
  on analytics_gestao.published_competencies;
create policy published_competencies_select_management
on analytics_gestao.published_competencies for select
to authenticated
using ((select security.is_active_role('gestao_municipal')));
