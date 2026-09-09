# Verificação da V3 — Marco 6

Registro de evidências da bateria de verificação executada antes do pacote de
registro. Cada linha aponta para o teste que sustenta a afirmação; onde a
verificação depende do ambiente hospedado, isso está dito explicitamente em vez
de ser apresentado como aprovado.

Commit verificado: ver `CHANGELOG_V3.md` / `MANIFESTO_REGISTRO.md`.
Data da execução: 2026-09-09.

---

## 1. Suítes automatizadas

| Suíte | Comando | Resultado |
|---|---|---|
| Unidade / TypeScript | `npm test` (Vitest 5) | **110 asserções, 110 aprovadas**, 7 arquivos |
| Tipagem | `npm run typecheck` (`tsc --noEmit`) | **sem erros** |
| Lint | `npm run lint` (ESLint 9 + `eslint-config-next`) | **sem erros e sem avisos** |
| Build de produção | `npm run build` (Next.js 16.3.4, Turbopack) | **19 rotas compiladas** |
| Dependências | `npm audit` | **0 vulnerabilidades** |
| Banco / RLS | pgTAP, 4 arquivos em `supabase/tests/` | **92 asserções, 92 aprovadas** |
| Supabase Security Advisor | projeto hospedado | **0 ERROR**, 1 WARN, 2 INFO (ver §4) |

### Banco: como as 92 asserções foram executadas

O Docker não está disponível neste ambiente, então `supabase test db` não pôde
ser usado. Em vez de reduzir o escopo do teste, a bateria foi executada em um
cluster PostgreSQL 16 criado do zero, no qual:

1. um *stub* recria apenas o que a plataforma Supabase já provisiona — os papéis
   `anon`/`authenticated`/`service_role`/`authenticator`, os schemas
   `auth`/`storage`/`extensions`, `auth.users`, `auth.uid()` lendo o mesmo GUC
   que o PostgREST define, e `storage.buckets`/`storage.objects`;
2. **os oito arquivos reais de `supabase/migrations/` são aplicados na ordem**,
   sem edição, e todos aplicam limpos;
3. os quatro arquivos de teste rodam contra esse banco.

Isso valida não só as regras, mas também que a cadeia de migrations é aplicável
de ponta a ponta em um banco vazio — o que é a condição para reconstruir o
ambiente. A troca de papel nos testes é real (`set local role authenticated`
mais `request.jwt.claim.sub`), portanto o RLS é exercido de fato, não simulado.

| Arquivo | Asserções |
|---|---|
| `001_foundation_rls.test.sql` | 29 |
| `002_admin_actions.test.sql` | 15 |
| `003_professional_isolation.test.sql` | 24 |
| `004_siaps_c3_engine.test.sql` | 24 |

Limitação honesta do harness: ele reproduz a plataforma, não *é* a plataforma.
As políticas de `storage.objects` e o `pgrst.db_schemas` são aplicados, mas o
comportamento de ponta a ponta do Storage e do PostgREST só pode ser observado
no projeto hospedado.

---

## 2. Os quinze cenários

| # | Cenário | Situação | Evidência |
|---|---|---|---|
| 1 | Usuário **não autenticado** não acessa área privada | Verificado | `guards.test.ts` "bloqueia usuário não autenticado"; `001` ok 11 "unauthenticated user cannot access private clinical data"; toda página privada chama `enforceRouteGuard` |
| 2 | Usuário **pendente** não acessa | Verificado | `guards.test.ts` "bloqueia aprovação pendente"; `001` ok 25 "pending user cannot read clinical data"; `navigation.ts` → `/aguardando-aprovacao?status=pendente` |
| 3 | Usuário **rejeitado** não acessa | Verificado | `guards.test.ts` "bloqueia cadastro rejeitado"; `001` ok 27 "rejected user cannot rewrite their own profile" |
| 4 | Usuário **bloqueado** não acessa | Verificado | `guards.test.ts` "bloqueia perfil bloqueado"; `001` ok 26 "blocked user cannot rewrite their own profile" |
| 5 | Profissional **A** não vê dados de **B** | Verificado | `003` ok 1–11 (pacientes, atendimentos, exames, vacinas e as duas *views*); `001` ok 21–22 |
| 6 | Profissional não acessa **Gestão** | Verificado | `guards.test.ts` "impede Profissional de acessar Gestão"; `001` ok 16; `004` ok 1 e ok 22 (nem pela rota, nem pelo banco) |
| 7 | Gestão não acessa dados do **Profissional** | Verificado | `guards.test.ts` "impede Gestão de acessar Profissional"; `003` ok 12–14 e ok 17; `001` ok 13 |
| 8 | **Administrador** não acessa dado clínico | Verificado | `003` ok 15–16; `001` ok 15. O administrador tem apenas `select` em `core.profiles` — nenhuma concessão em `professional` |
| 9 | Gestão **importa relatório SIAPS** | Verificado | `004` ok 3 (importa), ok 4 (checksum), ok 8 (publica), ok 9 (auditado) |
| 10 | Profissional **importa planilha do PEC** | Verificado | `003` ok 18–22; `pec-parser.test.ts` (23 asserções de cabeçalho, valores, CSV e desduplicação) |
| 11 | **PEC não altera o indicador oficial** | Verificado | `003` ok 23–24: depois de duas importações do PEC, `analytics_gestao.c3_team_competency` e `siaps.quality_rows` continuam vazios |
| 12 | **SIAPS não cria pacientes** | Verificado | `004` ok 23–24: depois da ingestão e da publicação, `professional.patients` e `professional.pec_imports` continuam vazios |
| 13 | Login com **Google** continua funcionando | **Requer o ambiente hospedado** | Código verificado: `signInWithOAuth` em `actions.ts:103` com `redirectTo` derivado de `canonicalOrigin()`, e `exchangeCodeForSession` em `auth/callback/route.ts:18`. O fluxo não foi alterado pelas correções — o que mudou foi a *origem* do link, que passou a vir de `NEXT_PUBLIC_APP_URL` em vez dos cabeçalhos. Exige credenciais reais e a lista de redirecionamento do Supabase (ver §5) |
| 14 | **Recuperação de senha** continua funcionando | **Requer o ambiente hospedado** | Código verificado: `resetPasswordForEmail` (`actions.ts:130`) e `updateUser({ password })` (`actions.ts:156`) — **sem exigir a senha atual**, como pedido. `access-fallback.test.ts` cobre o reconhecimento de `reauthentication_needed`. A sessão criada pela recuperação é nova, e o "Secure password change" do Supabase só exige reautenticação acima de 24 h, então o fluxo oficial permanece válido |
| 15 | **Logout** e roteamento por papel | Verificado (roteamento) / código verificado (logout) | `navigation.ts` `homeForRole` e `/sistema/page.tsx` redirecionam por papel; `access-fallback.test.ts` cobre todos os motivos de negativa. O `signOut` está em `sistema/layout.tsx` e depende da sessão real |

Nenhum dos quinze cenários falhou. Três (13, 14 e a metade do 15) não podem ser
declarados aprovados a partir daqui: dependem de credenciais e de configuração
do projeto hospedado, e estão marcados como tal em vez de serem contados como
verde.

---

## 3. O que a arquitetura garante além dos testes

A não contaminação entre os módulos (cenários 11 e 12) não depende de disciplina
de código: `professional.import_pec_batch` escreve apenas em `professional`, e
`siaps.ingest_quality_report` apenas em `siaps` e `analytics_gestao`. Não há
concessão cruzada entre os schemas para `authenticated`. Os testes 23–24 de cada
arquivo existem para que uma futura alteração que quebre essa separação falhe
imediatamente, em vez de silenciosamente misturar dado assistencial com
indicador institucional.

Não há `middleware.ts`: a proteção é feita por página, no servidor, com
`enforceRouteGuard`. É uma escolha deliberada — o *middleware* do Next.js não é
um limite de segurança confiável para dados, e o RLS do PostgreSQL continua
sendo a última linha mesmo que uma rota fosse esquecida. Os testes `001` e `003`
demonstram exatamente isso: a negativa acontece no banco, não na rota.

---

## 4. Supabase Security Advisor

Execução sobre o projeto hospedado, **antes** de aplicar as migrations novas.

- **0 ERROR.**
- **1 WARN — `auth_leaked_password_protection`.** A verificação contra o
  HaveIBeenPwned está desligada. É um interruptor do painel, não código.
  Ver §5.
- **2 INFO — `rls_enabled_no_policy`:**
  - `audit.events` — **esperado e correto**. A tabela tem RLS ligado e nenhuma
    política de propósito: `authenticated` não tem `usage` no schema `audit`. A
    trilha de auditoria é gravada por funções `security definer` e não deve ser
    legível pela aplicação. Deixar sem política é o modo mais restritivo
    possível.
  - `siaps.imports` — **será resolvido ao aplicar as migrations novas**. A
    migration `20260909030000_core_territory_and_siaps.sql` cria a política
    `imports_read_management`. O aviso reflete o estado atual do banco
    hospedado, que ainda não recebeu as migrations do Marco 3.

---

## 5. Configuração manual ainda necessária

Nada disto pode ser feito a partir do repositório; são ações no painel do
Supabase, na Vercel e no Google Cloud.

1. **`NEXT_PUBLIC_APP_URL`** — agora é obrigatória. Sem ela a aplicação falha na
   inicialização, de propósito: era a variável ausente que permitia envenenar o
   link de recuperação de senha por `X-Forwarded-Host`. Definir na Vercel (todos
   os ambientes) e no `.env.local` local, sem barra final e em HTTPS fora de
   *loopback*.
2. **Aplicar as migrations pendentes**, nesta ordem:
   `20260909004056_fix_profile_lifecycle_guards.sql`,
   `20260909010000_admin_profile_actions.sql`,
   `20260909020000_professional_module.sql`,
   `20260909030000_core_territory_and_siaps.sql`.
   Nenhuma foi aplicada ao projeto hospedado até aqui.
3. **Authentication → Providers → Email → "Secure password change"**: ligar.
4. **Authentication → Policies → "Leaked password protection"**: ligar (resolve
   o WARN da §4).
5. **Authentication → URL Configuration**: restringir a *Redirect URL allowlist*
   exatamente às origens legítimas, sem curingas amplos.
6. **Google Cloud → OAuth client**: conferir que os *Authorized redirect URIs*
   correspondem ao domínio canônico configurado em `NEXT_PUBLIC_APP_URL`.

Depois de (1) e (2), os cenários 13, 14 e o logout do 15 podem ser exercidos de
ponta a ponta e esta tabela pode ser fechada.
