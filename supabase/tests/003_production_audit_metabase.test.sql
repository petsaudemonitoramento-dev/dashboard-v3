begin;
create extension if not exists pgtap with schema extensions;
select plan(34);

select has_view('analytics','dashboard_team_directory','team directory view exists');
select has_view('analytics','dashboard_c3_team_monthly','team monthly view exists');
select has_view('analytics','dashboard_c3_practices','practice detail view exists');
select has_view('analytics','dashboard_competencies','competency view exists');
select has_view('analytics','dashboard_c3_establishment_monthly','establishment view exists');
select has_view('analytics','dashboard_c3_district_monthly','district view exists');
select has_view('analytics','dashboard_c3_practice_summary','practice summary view exists');
select is((select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='analytics' and c.relkind='v'
    and not ('security_invoker=true'=any(coalesce(c.reloptions,array[]::text[])))),0::bigint,
  'all analytics views use security_invoker');

select has_function('public','update_establishment_identity',array['uuid','text','text'],'identity RPC exists');
select has_function('public','publish_siaps_c3_v1',array['jsonb','jsonb'],'atomic import RPC exists');
select ok(has_function_privilege('authenticated','public.update_establishment_identity(uuid,text,text)','EXECUTE'),'authenticated may invoke guarded identity RPC');
select ok(not has_function_privilege('anon','public.update_establishment_identity(uuid,text,text)','EXECUTE'),'anon cannot invoke identity RPC');
select ok(has_function_privilege('service_role','public.publish_siaps_c3_v1(jsonb,jsonb)','EXECUTE'),'service role may invoke atomic import RPC');
select ok(not has_function_privilege('authenticated','public.publish_siaps_c3_v1(jsonb,jsonb)','EXECUTE'),'authenticated cannot invoke privileged import RPC');
select ok(not has_function_privilege('service_role','public.ingest_siaps_c3(jsonb,jsonb)','EXECUTE'),'legacy ingest is closed to service role');
select ok(not has_function_privilege('service_role','public.stage_siaps_c3_compact(jsonb,jsonb,boolean)','EXECUTE'),'staged non-atomic ingest is closed');
select ok(not has_function_privilege('service_role','public.ingest_siaps_c3_compact(jsonb,jsonb)','EXECUTE'),'legacy compact ingest is closed');

insert into auth.users(id,email,encrypted_password,aud,role,created_at,updated_at) values
 ('40000000-0000-0000-0000-000000000001','gestao-prod@test.local','','authenticated','authenticated',now(),now()),
 ('40000000-0000-0000-0000-000000000002','leitura-prod@test.local','','authenticated','authenticated',now(),now()),
 ('40000000-0000-0000-0000-000000000003','admin-prod@test.local','','authenticated','authenticated',now(),now());
insert into app.profiles(user_id,email,role,active) values
 ('40000000-0000-0000-0000-000000000001','gestao-prod@test.local','gestao',true),
 ('40000000-0000-0000-0000-000000000002','leitura-prod@test.local','leitura',true),
 ('40000000-0000-0000-0000-000000000003','admin-prod@test.local','admin',true);

set local role service_role;
select lives_ok($$
  select public.publish_siaps_c3_v1(
    jsonb_build_object('filename','c3-2026-01.xlsx','file_sha256',repeat('c',64),
      'competency','2026-01-01','rows_total',2,'uploaded_by','40000000-0000-0000-0000-000000000001'),
    jsonb_build_array(
      jsonb_build_array(20,'7654321','UBS BI','UBS','0000000002','Equipe 2','eSF',2,1,1,1,1,1,1,1,1,1,1,110,2,55),
      jsonb_build_array(21,'7654321','UBS BI','UBS','0000000003','Equipe 3','eSF',1,1,1,1,1,1,1,1,1,1,1,100,1,100)
    )
  )
$$,'valid C3 workbook is published atomically');
reset role;

select is((select points_total from analytics.dashboard_competencies where competency='2026-01-01'),210::numeric,'competency exposes additive points');
select is((select denominator from analytics.dashboard_competencies where competency='2026-01-01'),3::numeric,'competency exposes additive denominator');
select is((select round(c3,2) from analytics.dashboard_competencies where competency='2026-01-01'),70.00::numeric,'competency C3 uses ratio of sums');
select is((select count(*) from analytics.dashboard_c3_team_monthly where classification in ('Bom','Ótimo')),2::bigint,'classification boundaries are available per team');

insert into siaps.imports(id,filename,file_sha256,competency,source_status,status,rows_total,uploaded_by)
values ('50000000-0000-0000-0000-000000000001','zero.xlsx',repeat('d',64),'2026-02-01','preliminar','publicado',1,'40000000-0000-0000-0000-000000000001');
insert into analytics.c3_team_monthly(source_import_id,competency,team_id,establishment_id,denominator,points_total,is_current)
select '50000000-0000-0000-0000-000000000001','2026-02-01',t.id,e.id,0,0,true
from core.teams t join core.team_establishment_history h on h.team_id=t.id and h.valid_to is null
join core.establishments e on e.id=h.establishment_id where t.ine='0000000002';
select ok((select c3 is null from analytics.dashboard_competencies where competency='2026-02-01'),'zero denominator produces null C3');

set local role authenticated;
select set_config('request.jwt.claim.sub','40000000-0000-0000-0000-000000000003',true);
select is((select count(*) from analytics.c3_team_monthly),0::bigint,'admin cannot read dashboard facts');
select is((select count(*) from siaps.imports),0::bigint,'admin cannot read import history');
select set_config('request.jwt.claim.sub','40000000-0000-0000-0000-000000000001',true);
select is((select count(*) from analytics.c3_team_monthly),3::bigint,'gestao reads dashboard facts');
select is((select count(*) from siaps.imports),2::bigint,'gestao reads import history');
select set_config('request.jwt.claim.sub','40000000-0000-0000-0000-000000000002',true);
select is((select count(*) from analytics.c3_team_monthly),3::bigint,'leitura reads dashboard facts');
select is((select count(*) from siaps.imports),0::bigint,'leitura cannot read import history');
select set_config('request.jwt.claim.sub','40000000-0000-0000-0000-000000000001',true);
select throws_ok(
  $$select public.update_establishment_identity((select id from core.establishments where cnes='7654321'),'UBS Alterada','7654329')$$,
  '42501','Apenas administradores ativos podem alterar a identidade da UBS','gestao cannot change UBS identity');
select set_config('request.jwt.claim.sub','40000000-0000-0000-0000-000000000003',true);
select lives_ok(
  $$select public.update_establishment_identity((select id from core.establishments where cnes='7654321'),'UBS Alterada','7654329')$$,
  'admin changes UBS identity');
reset role;
select is((select cnes from core.establishments where name='UBS Alterada'),'7654329','CNES is persisted without changing internal UUID');
select is((select metadata->>'previous_cnes' from audit.events where event_type='establishment_identity_changed' order by id desc limit 1),'7654321','audit preserves previous CNES');
select ok(not has_table_privilege('authenticated','study.cohorts','SELECT'),'pilot cohort is not exposed as an application module');

select * from finish();
rollback;
