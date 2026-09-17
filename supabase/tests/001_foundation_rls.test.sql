begin;
create extension if not exists pgtap with schema extensions;
select plan(20);

select has_schema('core', 'core schema exists');
select has_schema('professional', 'professional schema exists');
select has_schema('siaps', 'siaps schema exists');
select has_schema('analytics_gestao', 'analytics schema exists');
select has_schema('security', 'security schema exists');
select has_schema('audit', 'audit schema exists');

select ok(
  (select relrowsecurity from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'core' and c.relname = 'profiles'),
  'profiles has RLS'
);
select ok(
  (select relrowsecurity from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'professional' and c.relname = 'patients'),
  'professional patients has RLS'
);
select ok(
  (select relrowsecurity from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'siaps' and c.relname = 'imports'),
  'SIAPS imports has RLS'
);
select ok(
  (select relrowsecurity from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'audit' and c.relname = 'events'),
  'audit events has RLS'
);

insert into auth.users (id, email, encrypted_password, aud, role, created_at, updated_at)
values
  ('10000000-0000-0000-0000-000000000001', 'pro@test.local', '', 'authenticated', 'authenticated', now(), now()),
  ('10000000-0000-0000-0000-000000000002', 'management@test.local', '', 'authenticated', 'authenticated', now(), now()),
  ('10000000-0000-0000-0000-000000000003', 'admin@test.local', '', 'authenticated', 'authenticated', now(), now()),
  ('10000000-0000-0000-0000-000000000004', 'pending@test.local', '', 'authenticated', 'authenticated', now(), now());

update core.profiles
set full_name = 'Professional', completed_at = now(), approval_status = 'aprovado'
where user_id = '10000000-0000-0000-0000-000000000001';

update core.profiles
set full_name = 'Management', completed_at = now(), approval_status = 'aprovado',
    role = 'gestao_municipal'
where user_id = '10000000-0000-0000-0000-000000000002';

update core.profiles
set full_name = 'Administrator', completed_at = now(), approval_status = 'aprovado',
    role = 'administrador'
where user_id = '10000000-0000-0000-0000-000000000003';

update core.profiles
set full_name = 'Pending', completed_at = now()
where user_id = '10000000-0000-0000-0000-000000000004';

insert into professional.patients (owner_user_id, display_name)
values ('10000000-0000-0000-0000-000000000001', 'Private patient');

insert into siaps.imports (id, filename, sha256, storage_path, imported_by)
values (
  '20000000-0000-0000-0000-000000000001',
  'foundation.xlsx',
  repeat('a', 64),
  'tests/foundation.xlsx',
  '10000000-0000-0000-0000-000000000002'
);

insert into analytics_gestao.published_competencies (
  competency, source_import_id, published_by
)
values (
  '2026-06-01',
  '20000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000002'
);

set local role anon;
select throws_ok(
  'select * from professional.patients',
  '42501',
  null,
  'unauthenticated user cannot access private clinical data'
);
reset role;

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
set local role authenticated;
select is(
  (select count(*) from professional.patients),
  1::bigint,
  'professional reads own patient'
);
reset role;

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000002', true);
set local role authenticated;
select is(
  (select count(*) from professional.patients),
  0::bigint,
  'management cannot read clinical data'
);
select is(
  (select count(*) from analytics_gestao.published_competencies),
  1::bigint,
  'management can read analytics metadata'
);
reset role;

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000003', true);
set local role authenticated;
select is(
  (select count(*) from professional.patients),
  0::bigint,
  'administrator cannot read clinical data'
);
reset role;

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
set local role authenticated;
select is(
  (select count(*) from analytics_gestao.published_competencies),
  0::bigint,
  'professional cannot read management analytics'
);
select throws_ok(
  $$select security.admin_update_profile(
    '10000000-0000-0000-0000-000000000004',
    'profissional',
    'aprovado',
    true,
    false
  )$$,
  '42501',
  'administrator required',
  'professional cannot call administrative mutation'
);
reset role;

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000003', true);
set local role authenticated;
select lives_ok(
  $$select security.admin_update_profile(
    '10000000-0000-0000-0000-000000000004',
    'profissional',
    'aprovado',
    true,
    false
  )$$,
  'administrator can approve a profile'
);
reset role;

select ok(
  exists (
    select 1 from audit.events
    where target_id = '10000000-0000-0000-0000-000000000004'
      and action = 'profile.approval_changed'
  ),
  'administrative profile change is audited'
);

select is(
  (select count(*) from storage.buckets where id in (
    'siaps-source', 'territorio-source', 'professional-source'
  ) and public = false),
  3::bigint,
  'all source buckets are private'
);

select * from finish();
rollback;
