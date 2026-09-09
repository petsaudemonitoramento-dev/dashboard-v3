-- Marco 2 · Isolamento real do módulo Profissional.
--
-- A regra que este arquivo precisa provar é a central do contrato: o
-- Profissional A nunca alcança dado do Profissional B, e nem Gestão nem
-- Administrador alcançam dado clínico por força do papel.

begin;
create extension if not exists pgtap with schema extensions;
select plan(22);

insert into auth.users (id, email, encrypted_password, aud, role, created_at, updated_at)
values
  ('40000000-0000-0000-0000-00000000000a', 'pro-a@test.local', '', 'authenticated', 'authenticated', now(), now()),
  ('40000000-0000-0000-0000-00000000000b', 'pro-b@test.local', '', 'authenticated', 'authenticated', now(), now()),
  ('40000000-0000-0000-0000-00000000000c', 'gestao@test.local', '', 'authenticated', 'authenticated', now(), now()),
  ('40000000-0000-0000-0000-00000000000d', 'admin@test.local', '', 'authenticated', 'authenticated', now(), now());

update core.profiles set full_name = 'Profissional A', completed_at = now(), approval_status = 'aprovado'
where user_id = '40000000-0000-0000-0000-00000000000a';
update core.profiles set full_name = 'Profissional B', completed_at = now(), approval_status = 'aprovado'
where user_id = '40000000-0000-0000-0000-00000000000b';
update core.profiles set full_name = 'Gestao', completed_at = now(), approval_status = 'aprovado',
  role = 'gestao_municipal'
where user_id = '40000000-0000-0000-0000-00000000000c';
update core.profiles set full_name = 'Admin', completed_at = now(), approval_status = 'aprovado',
  role = 'administrador'
where user_id = '40000000-0000-0000-0000-00000000000d';

-- Dados de cada profissional, criados com privilégio para montar o cenário.
insert into professional.patients (owner_user_id, display_name, birth_date, dedup_key, risk_level)
values
  ('40000000-0000-0000-0000-00000000000a', 'Paciente da A', '1994-03-15', 'paciente da a|1994-03-15', 'alto'),
  ('40000000-0000-0000-0000-00000000000b', 'Paciente da B', '1990-01-20', 'paciente da b|1990-01-20', 'habitual');

insert into professional.encounters (patient_id, owner_user_id, occurred_on, kind)
select id, owner_user_id, current_date - 10, 'consulta_prenatal'
from professional.patients;

insert into professional.exams (patient_id, owner_user_id, exam_type, collected_on, result)
select id, owner_user_id, 'sifilis', current_date - 20, 'nao_reagente'
from professional.patients;

insert into professional.vaccinations (patient_id, owner_user_id, vaccine, applied_on)
select id, owner_user_id, 'dtpa', current_date - 30
from professional.patients;

-- ---------------------------------------------------------------------------
-- Profissional A
-- ---------------------------------------------------------------------------

select set_config('request.jwt.claim.sub', '40000000-0000-0000-0000-00000000000a', true);
set local role authenticated;

select is((select count(*) from professional.patients), 1::bigint,
  'profissional A enxerga apenas a própria paciente');
select is((select count(*) from professional.patients
            where owner_user_id = '40000000-0000-0000-0000-00000000000b'), 0::bigint,
  'profissional A não alcança paciente de B nem filtrando por owner');
select is((select count(*) from professional.encounters), 1::bigint,
  'profissional A enxerga apenas os próprios atendimentos');
select is((select count(*) from professional.exams), 1::bigint,
  'profissional A enxerga apenas os próprios exames');
select is((select count(*) from professional.vaccinations), 1::bigint,
  'profissional A enxerga apenas as próprias vacinas');

-- As views usam security_invoker: sem isso rodariam como o dono e vazariam tudo.
select is((select count(*) from professional.vw_patient_overview), 1::bigint,
  'a view de visão geral respeita o RLS (security_invoker)');
select is((select count(*) from professional.vw_patient_alerts
            where owner_user_id <> '40000000-0000-0000-0000-00000000000a'), 0::bigint,
  'a view de alertas não vaza paciente de outro profissional');

-- Escrever em nome de outro profissional é recusado pelo WITH CHECK.
select throws_ok(
  $$insert into professional.patients (owner_user_id, display_name)
    values ('40000000-0000-0000-0000-00000000000b', 'Invasao')$$,
  '42501',
  null,
  'profissional A não cria registro em nome de B'
);

-- Tentar reatribuir a própria paciente para outro dono também é recusado.
select throws_ok(
  $$update professional.patients
      set owner_user_id = '40000000-0000-0000-0000-00000000000b'$$,
  '42501',
  null,
  'profissional A não transfere paciente para B'
);

reset role;

-- ---------------------------------------------------------------------------
-- Profissional B — controle positivo
-- ---------------------------------------------------------------------------

select set_config('request.jwt.claim.sub', '40000000-0000-0000-0000-00000000000b', true);
set local role authenticated;
select is((select count(*) from professional.patients), 1::bigint,
  'profissional B enxerga a própria paciente');
select is((select display_name from professional.patients), 'Paciente da B',
  'profissional B enxerga exatamente o próprio registro');
reset role;

-- ---------------------------------------------------------------------------
-- Gestão e Administrador não recebem prontuário
-- ---------------------------------------------------------------------------

select set_config('request.jwt.claim.sub', '40000000-0000-0000-0000-00000000000c', true);
set local role authenticated;
select is((select count(*) from professional.patients), 0::bigint,
  'gestão municipal não lê pacientes');
select is((select count(*) from professional.encounters), 0::bigint,
  'gestão municipal não lê atendimentos');
select is((select count(*) from professional.vw_patient_overview), 0::bigint,
  'gestão municipal não lê a view de pacientes');
reset role;

select set_config('request.jwt.claim.sub', '40000000-0000-0000-0000-00000000000d', true);
set local role authenticated;
select is((select count(*) from professional.patients), 0::bigint,
  'administrador não lê pacientes por ser administrador');
select is((select count(*) from professional.exams), 0::bigint,
  'administrador não lê exames');
reset role;

-- ---------------------------------------------------------------------------
-- Importação PEC
-- ---------------------------------------------------------------------------

select set_config('request.jwt.claim.sub', '40000000-0000-0000-0000-00000000000c', true);
set local role authenticated;
select throws_ok(
  $$select professional.import_pec_batch('x.csv', repeat('a',64), 'v1', '[]'::jsonb)$$,
  '42501',
  'professional profile required',
  'gestão não importa PEC'
);
reset role;

select set_config('request.jwt.claim.sub', '40000000-0000-0000-0000-00000000000a', true);
set local role authenticated;

select lives_ok(
  $$select professional.import_pec_batch('carteira.csv', repeat('b',64), 'pec-planilha@1.0.0',
    '[{"displayName":"Nova Gestante","birthDate":"1995-05-05","dedupKey":"nova gestante|1995-05-05","prenatalStartDate":null,"dueDate":null,"riskLevel":"habitual"}]'::jsonb)$$,
  'profissional importa lote do PEC'
);

select is((select count(*) from professional.patients), 2::bigint,
  'a importação criou a paciente na carteira do importador');

-- O mesmo arquivo não entra duas vezes.
select throws_ok(
  $$select professional.import_pec_batch('carteira.csv', repeat('b',64), 'pec-planilha@1.0.0', '[]'::jsonb)$$,
  '23505',
  'file already imported',
  'reimportação do mesmo arquivo é recusada'
);

-- Reimportar a mesma pessoa em arquivo diferente atualiza, não duplica.
select lives_ok(
  $$select professional.import_pec_batch('carteira2.csv', repeat('c',64), 'pec-planilha@1.0.0',
    '[{"displayName":"Nova Gestante","birthDate":"1995-05-05","dedupKey":"nova gestante|1995-05-05","prenatalStartDate":"2026-02-01","dueDate":null,"riskLevel":"alto"}]'::jsonb)$$,
  'segunda importação da mesma paciente é aceita'
);

select is((select count(*) from professional.patients), 2::bigint,
  'a desduplicação evitou registro duplicado');

reset role;

select * from finish();
rollback;
