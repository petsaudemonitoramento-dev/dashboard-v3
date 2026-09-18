# Débitos técnicos de segurança

Achados da auditoria da Fase 1 (PR #2) que foram **aceitos conscientemente** e
não bloqueiam o merge. Cada item registra o risco real, onde está e o que
resolve.

Os achados **crítico e altos** da mesma auditoria (C1, A1, A2, A3) e os médios
M1 e M2 já foram corrigidos nesta branch — não estão nesta lista.

| ID | Severidade | Título | Fase sugerida |
|---|---|---|---|
| M3 | Médio | Fidelidade da auditoria no bootstrap do administrador | 2 |
| M4 | Médio | Sem captcha e sem exigência de complexidade de senha | 2 |
| B2 | Baixo | Auditoria não cobre criação de perfil | 2 |
| B3 | Baixo | `alter default privileges` só vale para o role criador | 2 |
| B4 | Baixo | `pgrst.db_schemas` pode ser sobrescrito pelo dashboard | 2 |
| B5 | Baixo | Sem CI | 6 |
| B6 | Baixo | MFA desabilitada para administrador | 6 |

---

## M3 · Fidelidade da auditoria no bootstrap do administrador

**Onde:** `supabase/migrations/20260908230633_authorization_audit_rls.sql`,
linhas 302 e 315.

`security.bootstrap_first_administrator` grava `approved_by = selected_user_id`
e `actor_user_id = selected_user_id`. O registro de auditoria afirma que o
usuário aprovou a si mesmo; o ator real — quem executou o SQL — não fica
registrado. Há também uma janela entre a checagem `exists` (linha 272) e o
`update` (linha 296) sem serialização.

**Risco:** baixo na prática, porque a função está revogada de `anon` e
`authenticated` e só roda com acesso ao SQL Editor. Mas é a função mais
sensível do sistema e a trilha de auditoria dela é enganosa.

**Correção:** registrar `current_user`/`session_user` no `metadata` e proteger a
checagem com `pg_advisory_xact_lock`, como já é feito em
`admin_update_profile` após a correção do M2.

## M4 · Sem captcha e sem exigência de complexidade de senha

**Onde:** `supabase/config.toml` linhas 184 (`password_requirements = ""`),
212-216 (`[auth.captcha]` comentado) e 229 (`max_frequency = "1s"`).

Cadastro público e recuperação de senha ficam abusáveis para enumeração de
e-mails e disparo de spam. Os limites de plataforma (`[auth.rate_limit]`)
ajudam, mas 1 segundo entre e-mails de recuperação é permissivo.

**Correção:** habilitar hCaptcha ou Turnstile no Auth, exigir ao menos
`lower_upper_letters_digits` e elevar `max_frequency` para 60s. Exige
configuração no dashboard além do `config.toml`.

## B2 · Auditoria não cobre criação de perfil

**Onde:** `supabase/migrations/20260908230633_authorization_audit_rls.sql`,
linhas 196-199.

O gatilho `profiles_audit_privileged_changes` é `after update`. A criação do
perfil (via `security.handle_new_auth_user`) e eventual remoção física não
geram evento em `audit.events`.

**Correção:** estender o gatilho para `insert` e `delete`, com ação própria.

## B3 · `alter default privileges` só vale para o role criador

**Onde:** `supabase/migrations/20260908230613_foundation_schemas_profiles.sql`,
linhas 22-33.

`alter default privileges` aplica-se apenas a objetos criados pelo mesmo role
que executou o comando. Se uma migration futura rodar por outro papel, as
tabelas novas não herdam as revogações e podem nascer acessíveis.

**Correção:** revogar explicitamente ao final de cada migration que cria
tabelas, e adicionar um teste pgTAP que falhe se `anon`/`authenticated` tiver
qualquer privilégio inesperado nos schemas isolados.

## B4 · `pgrst.db_schemas` pode ser sobrescrito pelo dashboard

**Onde:** `supabase/migrations/20260908230613_foundation_schemas_profiles.sql`,
linhas 173-175.

A lista de schemas expostos pela Data API é definida por
`alter role authenticator`, mas também é configurável pelo dashboard do
Supabase. Uma mudança lá sobrescreve silenciosamente a decisão versionada e
poderia expor `professional`, `siaps`, `analytics_gestao` ou `audit`.

**Correção:** teste pgTAP que afirme a lista exata de schemas expostos, para
que a divergência apareça na suíte em vez de em produção.

## B5 · Sem CI

Não há workflow em `.github/workflows`. O §20 do contrato exige build, lint e
testes em CI. É escopo declarado da Fase 6, mas a PR já se beneficiaria de
`npm test` + `supabase test db` a cada push.

## B6 · MFA desabilitada para administrador

**Onde:** `supabase/config.toml`, linhas 301-308.

O papel `administrador` gerencia aprovações e papéis de todos os usuários de
uma plataforma de saúde. TOTP para esse papel é proporcional ao risco.

**Correção:** habilitar `[auth.mfa.totp]` e exigir AAL2 para as rotas
administrativas.
