-- Marcos 3 e 4 · Motor C3 e escopo territorial.
--
-- Os valores usados aqui são reais, extraídos das exportações do SIAPS de
-- JUN/2026 do município 250400. Servem como golden set do motor:
--   MARIA DE L. LEONCIO EQ. III  A..K = 19,10,12,11,4,13,11,1,4,2,9
--                                pontos 883 · denominador 21 · razão 42,05
--   MALVINAS II EQ II            A..K = 7,4,4,4,5,7,6,3,4,2,1
--                                pontos 430 · denominador 10 · razão 43,00
--   POLICLINICA DA PALMEIRA      zerada, denominador 0, fora do escopo

begin;
create extension if not exists pgtap with schema extensions;
select plan(22);

insert into auth.users (id, email, encrypted_password, aud, role, created_at, updated_at)
values
  ('50000000-0000-0000-0000-000000000001', 'gestao@test.local', '', 'authenticated', 'authenticated', now(), now()),
  ('50000000-0000-0000-0000-000000000002', 'prof@test.local', '', 'authenticated', 'authenticated', now(), now());

update core.profiles set full_name = 'Gestao Municipal', completed_at = now(),
  approval_status = 'aprovado', role = 'gestao_municipal'
where user_id = '50000000-0000-0000-0000-000000000001';
update core.profiles set full_name = 'Profissional', completed_at = now(),
  approval_status = 'aprovado'
where user_id = '50000000-0000-0000-0000-000000000002';

-- Território: duas UBS elegíveis e uma policlínica fora do escopo.
insert into core.districts (id, code, name) values
  ('51000000-0000-0000-0000-000000000001', 'IV', 'Distrito Sanitário IV');

insert into core.establishments (id, cnes, name, unit_type, includes_panel, exclusion_reason) values
  ('52000000-0000-0000-0000-000000000001', '6267939', 'UBS MARIA DE LOURDES LEONCIO', 'UBS', true, null),
  ('52000000-0000-0000-0000-000000000002', '5053285', 'UBS MALVINAS II', 'UBS', true, null),
  ('52000000-0000-0000-0000-000000000003', '2362236', 'POLICLINICA DA PALMEIRA', 'POLICLINICA', false, 'POLICLINICA');

insert into core.establishment_district_validity (establishment_id, district_id, valid_from) values
  ('52000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000001', '2026-01-01'),
  ('52000000-0000-0000-0000-000000000002', '51000000-0000-0000-0000-000000000001', '2026-01-01'),
  ('52000000-0000-0000-0000-000000000003', '51000000-0000-0000-0000-000000000001', '2026-01-01');

insert into core.teams (ine, name, team_type) values
  ('0002183307', 'MARIA DE L. LEONCIO - EQ. III', 'eSF'),
  ('0002437708', 'MALVINAS II - EQ II', 'eSF'),
  ('0002256738', 'EAP - PALMEIRA', 'eAP');

-- ---------------------------------------------------------------------------
-- Autorização da ingestão
-- ---------------------------------------------------------------------------

select set_config('request.jwt.claim.sub', '50000000-0000-0000-0000-000000000002', true);
set local role authenticated;
select throws_ok(
  $$select siaps.ingest_quality_report('{"competency":"2026-06-01","sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}'::jsonb, '[]'::jsonb)$$,
  '42501', 'municipal management profile required',
  'profissional não importa SIAPS'
);
reset role;

select set_config('request.jwt.claim.sub', '50000000-0000-0000-0000-000000000001', true);
set local role authenticated;

-- Série oficial começa em JAN/2026.
select throws_ok(
  $$select siaps.ingest_quality_report('{"competency":"2025-12-01","sha256":"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb","filename":"x.xlsx"}'::jsonb, '[]'::jsonb)$$,
  '22023', 'competency before the official series start',
  'competência anterior a JAN/2026 é recusada'
);

-- ---------------------------------------------------------------------------
-- Ingestão com dados reais
-- ---------------------------------------------------------------------------

select lives_ok(
  $$select siaps.ingest_quality_report(
    '{"competency":"2026-06-01","sha256":"1111111111111111111111111111111111111111111111111111111111111111",
      "filename":"jun26.xlsx","municipalityIbge":"250400","uf":"PB",
      "generatedAt":"2026-09-04T19:20:00Z","sourceStatus":"preliminar",
      "scopeSignature":"eAP,eSF","parserVersion":"siaps@1.0.0"}'::jsonb,
    '[
      {"fileRow":19,"cnes":"6267939","establishmentName":"UBS MARIA DE LOURDES LEONCIO","ine":"0002183307","teamName":"MARIA DE L. LEONCIO - EQ. III","teamType":"eSF","practices":[19,10,12,11,4,13,11,1,4,2,9],"pointsTotal":883,"denominator":21,"ratioText":"42,05"},
      {"fileRow":20,"cnes":"5053285","establishmentName":"UBS MALVINAS II","ine":"0002437708","teamName":"MALVINAS II - EQ II","teamType":"eSF","practices":[7,4,4,4,5,7,6,3,4,2,1],"pointsTotal":430,"denominator":10,"ratioText":"43,00"},
      {"fileRow":23,"cnes":"2362236","establishmentName":"POLICLINICA DA PALMEIRA","ine":"0002256738","teamName":"EAP - PALMEIRA","teamType":"eAP","practices":[0,0,0,0,0,0,0,0,0,0,0],"pointsTotal":0,"denominator":0,"ratioText":"0,00"}
    ]'::jsonb)$$,
  'gestão municipal importa o relatório'
);

select is(
  (select publication_block from siaps.imports
    where sha256 = '1111111111111111111111111111111111111111111111111111111111111111'),
  null,
  'checksum das boas práticas confere: 10*A + 9*(B..K) reproduz os pontos'
);

select is(
  (select rows_eligible from siaps.imports
    where sha256 = '1111111111111111111111111111111111111111111111111111111111111111'),
  2,
  'duas equipes elegíveis; a policlínica ficou fora pela lista positiva'
);

select is(
  (select rows_excluded from siaps.imports
    where sha256 = '1111111111111111111111111111111111111111111111111111111111111111'),
  1,
  'a policlínica é excluída, não rejeitada'
);

select is(
  (select exclusion_reason from analytics_gestao.c3_team_competency
    where source_ine = '0002256738'),
  'POLICLINICA',
  'a exclusão registra o motivo, respondendo por que o painel mostra menos equipes'
);

-- ---------------------------------------------------------------------------
-- Publicação
-- ---------------------------------------------------------------------------

select lives_ok(
  $$select siaps.publish_import(
    (select id from siaps.imports
      where sha256 = '1111111111111111111111111111111111111111111111111111111111111111'))$$,
  'competência validada é publicada'
);

-- A auditoria é fechada a `authenticated` por design: a verificação roda fora
-- do papel, com privilégio, o que é em si a prova de que a gestão não a lê.
reset role;
select ok(
  exists (select 1 from audit.events where action = 'siaps.import_published'),
  'a publicação é registrada na auditoria'
);
set local role authenticated;

-- ---------------------------------------------------------------------------
-- Motor C3
-- ---------------------------------------------------------------------------

select is(
  (select round(result, 2) from analytics_gestao.vw_c3_team where ine = '0002183307'),
  42.05,
  'equipe LEONCIO III: 883/21 = 42,05, idêntico ao publicado pelo SIAPS'
);

select is(
  (select round(result, 2) from analytics_gestao.vw_c3_team where ine = '0002437708'),
  43.00,
  'equipe MALVINAS II: 430/10 = 43,00'
);

select is(
  (select classification from analytics_gestao.vw_c3_team where ine = '0002183307'),
  'Suficiente',
  'faixa oficial: 42,05 está em >25 e <=50'
);

-- Recomposição aditiva no município: (883+430)/(21+10) = 42,35...
-- A média simples das equipes daria (42,05+43,00)/2 = 42,525 — proibida.
select is(
  (select round(result, 4) from analytics_gestao.vw_c3_municipality),
  round((883 + 430)::numeric / (21 + 10), 4),
  'município recompõe por SUM(pontos)/SUM(denominador)'
);

select isnt(
  (select round(result, 4) from analytics_gestao.vw_c3_municipality),
  round((42.05 + 43.00)::numeric / 2, 4),
  'o resultado municipal NÃO é a média simples dos percentuais das equipes'
);

select is(
  (select denominator from analytics_gestao.vw_c3_municipality),
  31::bigint,
  'denominador municipal soma apenas as equipes elegíveis'
);

select is(
  (select round(result, 4) from analytics_gestao.vw_c3_district),
  round((883 + 430)::numeric / (21 + 10), 4),
  'distrito usa a mesma recomposição'
);

select is(
  (select teams_total from analytics_gestao.vw_c3_establishment where cnes = '6267939'),
  1::bigint,
  'agregação por UBS separa os estabelecimentos'
);

-- ---------------------------------------------------------------------------
-- Decomposição A–K
-- ---------------------------------------------------------------------------

select is(
  (select weight from analytics_gestao.vw_c3_practice_municipality where practice_code = 'A'),
  10,
  'a prática A pesa 10 pontos'
);

select is(
  (select weight from analytics_gestao.vw_c3_practice_municipality where practice_code = 'K'),
  9,
  'as demais práticas pesam 9 pontos'
);

select is(
  (select sum(weight) from analytics_gestao.vw_c3_practice_municipality),
  100::bigint,
  'a soma dos pesos das onze boas práticas é 100'
);

select is(
  (select fulfilled from analytics_gestao.vw_c3_practice_municipality where practice_code = 'A'),
  26::bigint,
  'a contagem da prática A soma as equipes elegíveis (19 + 7)'
);

reset role;

-- ---------------------------------------------------------------------------
-- Isolamento entre domínios
-- ---------------------------------------------------------------------------

select set_config('request.jwt.claim.sub', '50000000-0000-0000-0000-000000000002', true);
set local role authenticated;
select is(
  (select count(*) from analytics_gestao.c3_team_competency),
  0::bigint,
  'profissional não lê os fatos da gestão'
);
reset role;

select * from finish();
rollback;
