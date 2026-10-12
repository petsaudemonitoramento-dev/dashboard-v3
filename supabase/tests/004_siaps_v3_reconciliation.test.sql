begin;
create extension if not exists pgtap with schema extensions;
select plan(17);

select has_function('public', 'preview_siaps_c3_v3',
  array['uuid','date','text','text','jsonb','text','boolean'],
  'RPC de prévia C3 v3 instalada');
select has_function('public', 'publish_siaps_c3_v3',
  array['uuid','uuid','date','text','text','jsonb','text'],
  'RPC de publicação atômica C3 v3 instalada');
select ok(not has_function_privilege('authenticated',
  'public.publish_siaps_c3_v3(uuid,uuid,date,text,text,jsonb,text)', 'EXECUTE'),
  'sessões autenticadas não podem publicar via RPC privilegiada');
select ok(not has_table_privilege('authenticated','siaps.c3_editor_scopes','INSERT'),
  'usuários não podem conceder o próprio escopo');

insert into auth.users(id,email,encrypted_password,aud,role,created_at,updated_at)
values
('41000000-0000-0000-0000-000000000001','gestao-import-v2@test.local','','authenticated','authenticated',now(),now()),
('41000000-0000-0000-0000-000000000002','admin-import-v2@test.local','','authenticated','authenticated',now(),now());
insert into app.profiles(user_id,email,role,active) values
('41000000-0000-0000-0000-000000000001','gestao-import-v2@test.local','gestao',true),
('41000000-0000-0000-0000-000000000002','admin-import-v2@test.local','admin',true);

create temporary table tmp_c3_fixture as
select jsonb_build_array(
  1,'1234567','UBS Teste V2','UBS','1234567890','Equipe V2','eSF',
  2,1,1,1,1,1,1,1,1,1,1,
  110,3,36.67
) as row_a,
jsonb_build_array(
  2,'7654321','UBS Outra','UBS','0987654321','Equipe Outra','eSF',
  2,1,1,1,1,1,1,1,1,1,1,
  110,3,36.67
) as row_b;

-- Execução pgTAP ocorre sob papel de teste privilegiado;
-- as permissões de service_role são verificadas separadamente.
select is((
  select (public.preview_siaps_c3_v3(
    '41000000-0000-0000-0000-000000000001','2026-09-01',
    'equipe-a.xlsx', repeat('a',64), jsonb_build_array(row_a), 'CNES|INE'
  )->>'unauthorized')::int from tmp_c3_fixture
), 1, 'sem escopo, editor não tem publicação autorizada');
select throws_ok(
  $$select public.manage_siaps_c3_scope_v3(
    '41000000-0000-0000-0000-000000000001',
    '41000000-0000-0000-0000-000000000001','grant','equipe','1234567890')$$,
  '42501','Administrador ativo obrigatório','gestor não consegue dar permissão a si mesmo');
select lives_ok(
  $$select public.manage_siaps_c3_scope_v3(
    '41000000-0000-0000-0000-000000000002',
    '41000000-0000-0000-0000-000000000001','grant','equipe','1234567890')$$,
  'admin concede escopo específico de equipe');
select is((
  select (public.preview_siaps_c3_v3(
    '41000000-0000-0000-0000-000000000001','2026-09-01',
    'equipe-a.xlsx', repeat('a',64), jsonb_build_array(row_a), 'CNES|INE'
  )->>'new')::int from tmp_c3_fixture
), 1, 'equipe autorizada pode ser importada');

create temporary table tmp_c3_preview as
select (public.preview_siaps_c3_v3(
  '41000000-0000-0000-0000-000000000001','2026-09-01',
  'equipe-a.xlsx', repeat('a',64), jsonb_build_array(row_a), 'CNES|INE'
)->>'previewId')::uuid as id
from tmp_c3_fixture;

select lives_ok(
  $$select public.publish_siaps_c3_v3(
    '41000000-0000-0000-0000-000000000001',
    (select id from tmp_c3_preview),'2026-09-01',
    'equipe-a.xlsx',repeat('a',64),
    (select jsonb_build_array(row_a) from tmp_c3_fixture),'CNES|INE')$$,
  'publicação de uma equipe autorizada');
select is((
  select count(*) from analytics.c3_team_monthly
  where competency='2026-09-01' and is_current
), 1::bigint, 'uma única versão atual da equipe publicada');

select throws_ok(
  $$select public.publish_siaps_c3_v3(
    '41000000-0000-0000-0000-000000000001',
    (select id from tmp_c3_preview),'2026-09-01',
    'equipe-a.xlsx',repeat('a',64),
    (select jsonb_build_array(row_a) from tmp_c3_fixture),'CNES|INE')$$,
  '22023',null,'prévia não pode ser reutilizada');

select is((
  select (public.preview_siaps_c3_v3(
    '41000000-0000-0000-0000-000000000001','2026-09-01',
    'segunda.xlsx',repeat('b',64),jsonb_build_array(row_a,row_b),'CNES|INE'
  )->>'unauthorized')::int from tmp_c3_fixture
), 1,'planilha municipal detecta equipe fora do escopo');
select is((
  select (public.preview_siaps_c3_v3(
    '41000000-0000-0000-0000-000000000001','2026-09-01',
    'segunda.xlsx',repeat('b',64),jsonb_build_array(row_a,row_b),'CNES|INE'
  )->>'identical')::int from tmp_c3_fixture
), 1,'sobreposição idêntica é reconhecida sem duplicar');

select lives_ok(
  $$select public.manage_siaps_c3_scope_v3(
    '41000000-0000-0000-0000-000000000002',
    '41000000-0000-0000-0000-000000000001','grant','municipio',null)$$,
  'admin pode conceder escopo municipal explícito');
select is((
  select (public.preview_siaps_c3_v3(
    '41000000-0000-0000-0000-000000000001','2026-09-01',
    'segunda.xlsx',repeat('b',64),jsonb_build_array(row_a,row_b),'CNES|INE'
  )->>'new')::int from tmp_c3_fixture
), 1,'municipal pode mesclar uma equipe nova com outra idêntica');

select is((
  select count(*) from siaps.c3_editor_scopes
  where user_id='41000000-0000-0000-0000-000000000001'
), 2::bigint,'escopos são armazenados sem alterar dados clínicos');
select is((
  select count(*) from audit.events
  where event_type='siaps_c3_scope_grant'
  and actor_user_id='41000000-0000-0000-0000-000000000002'
), 2::bigint,'concessões são auditadas por administrador');

select * from finish();
rollback;
