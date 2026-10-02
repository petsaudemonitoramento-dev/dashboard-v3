-- Advisor hardening: cover the remaining FK and avoid duplicate SELECT policies.

create index if not exists profiles_deleted_by_idx
  on core.profiles (deleted_by)
  where deleted_by is not null;

drop policy if exists profiles_select_own on core.profiles;
drop policy if exists profiles_select_administrator on core.profiles;
drop policy if exists profiles_select_own_or_administrator on core.profiles;
create policy profiles_select_own_or_administrator
on core.profiles for select
to authenticated
using (
  (select auth.uid()) = user_id
  or (select security.is_active_role('administrador'))
);
