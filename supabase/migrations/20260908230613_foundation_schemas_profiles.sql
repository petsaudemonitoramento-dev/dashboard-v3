-- V3 foundation: isolated schemas, profile lifecycle and minimum boundary tables.

do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end
$$;

create schema if not exists core;
create schema if not exists professional;
create schema if not exists siaps;
create schema if not exists analytics_gestao;
create schema if not exists security;
create schema if not exists audit;

revoke all on schema core, professional, siaps, analytics_gestao, security, audit
  from public, anon, authenticated;
grant usage on schema core, security to authenticated;

alter default privileges in schema core
  revoke all on tables from public, anon, authenticated;
alter default privileges in schema professional
  revoke all on tables from public, anon, authenticated;
alter default privileges in schema siaps
  revoke all on tables from public, anon, authenticated;
alter default privileges in schema analytics_gestao
  revoke all on tables from public, anon, authenticated;
alter default privileges in schema audit
  revoke all on tables from public, anon, authenticated;
alter default privileges in schema security
  revoke execute on functions from public, anon, authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'core' and t.typname = 'user_role'
  ) then
    create type core.user_role as enum (
      'administrador',
      'gestao_municipal',
      'profissional'
    );
  end if;

  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'core' and t.typname = 'approval_status'
  ) then
    create type core.approval_status as enum (
      'pendente',
      'aprovado',
      'rejeitado'
    );
  end if;
end
$$;

create table if not exists core.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role core.user_role not null default 'profissional',
  full_name text,
  phone text,
  professional_registration text,
  approval_status core.approval_status not null default 'pendente',
  is_active boolean not null default true,
  completed_at timestamptz,
  approved_at timestamptz,
  approved_by uuid references auth.users(id) on delete set null,
  blocked_at timestamptz,
  blocked_by uuid references auth.users(id) on delete set null,
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_email_not_blank check (length(trim(email)) > 3),
  constraint profiles_full_name_when_complete check (
    completed_at is null or length(trim(full_name)) >= 3
  ),
  constraint profiles_block_state check (
    blocked_at is null or is_active = false
  )
);

create index if not exists profiles_approval_status_idx
  on core.profiles (approval_status)
  where deleted_at is null;
create index if not exists profiles_role_idx
  on core.profiles (role)
  where deleted_at is null;
create index if not exists profiles_approved_by_idx
  on core.profiles (approved_by)
  where approved_by is not null;
create index if not exists profiles_blocked_by_idx
  on core.profiles (blocked_by)
  where blocked_by is not null;

create table if not exists professional.patients (
  id bigint generated always as identity primary key,
  owner_user_id uuid not null references auth.users(id) on delete restrict,
  display_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint patients_display_name_not_blank check (length(trim(display_name)) > 0)
);

create index if not exists patients_owner_user_id_idx
  on professional.patients (owner_user_id);

create table if not exists siaps.imports (
  id uuid primary key default gen_random_uuid(),
  filename text not null,
  sha256 text not null unique,
  storage_path text not null unique,
  status text not null default 'recebido',
  imported_by uuid not null references auth.users(id) on delete restrict,
  imported_at timestamptz not null default now(),
  constraint imports_status_valid check (
    status in ('recebido', 'validado', 'candidato', 'publicado', 'rejeitado')
  ),
  constraint imports_sha256_valid check (sha256 ~ '^[a-f0-9]{64}$')
);

create index if not exists imports_imported_by_idx on siaps.imports (imported_by);

create table if not exists analytics_gestao.published_competencies (
  competency date primary key,
  source_import_id uuid not null references siaps.imports(id) on delete restrict,
  published_at timestamptz not null default now(),
  published_by uuid not null references auth.users(id) on delete restrict,
  constraint published_competency_month_start check (
    competency = date_trunc('month', competency)::date
  )
);

create unique index if not exists published_competencies_source_idx
  on analytics_gestao.published_competencies (source_import_id);
create index if not exists published_competencies_published_by_idx
  on analytics_gestao.published_competencies (published_by);

create table if not exists audit.events (
  id bigint generated always as identity primary key,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_type text not null,
  target_id text,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  constraint audit_action_not_blank check (length(trim(action)) > 0),
  constraint audit_target_type_not_blank check (length(trim(target_type)) > 0),
  constraint audit_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create index if not exists audit_events_actor_idx
  on audit.events (actor_user_id, occurred_at desc);
create index if not exists audit_events_target_idx
  on audit.events (target_type, target_id, occurred_at desc);

alter table core.profiles enable row level security;
alter table professional.patients enable row level security;
alter table siaps.imports enable row level security;
alter table analytics_gestao.published_competencies enable row level security;
alter table audit.events enable row level security;

-- Only explicitly required schemas are exposed through PostgREST.
alter role authenticator
  set pgrst.db_schemas = 'public, storage, graphql_public, core, security';
notify pgrst, 'reload config';
