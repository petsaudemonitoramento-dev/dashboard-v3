# Deploy do MAE APS

## Ambiente

- Node.js 22 ou superior.
- `NEXT_PUBLIC_APP_URL`: origem HTTPS canônica, sem barra final.
- `NEXT_PUBLIC_SUPABASE_URL`: `https://nyexakdyxtstcyycmlng.supabase.co` em produção.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: chave publicável do projeto V3.
- `SUPABASE_SECRET_KEY`: segredo exclusivo do runtime server-side; nunca prefixar com `NEXT_PUBLIC_`.

Confirme no Supabase Auth a URL canônica e `/auth/callback` na allow-list. A Data API remota já usa os schemas atuais. Não vincule ou execute `supabase db reset` contra o remoto.

Antes do release, execute também o checklist de autenticação em `docs/AUTENTICACAO.md`. As opções do `supabase/config.toml` são locais e precisam ser conferidas manualmente no Dashboard remoto, inclusive Google OAuth, SMTP, rotação de refresh token e Leaked Password Protection.

Revise também `docs/AUDITORIA.md` e confirme que não foram acrescentados IP,
User-Agent, identificador de sessão ou payload SIAPS aos eventos.

Em produção, `NEXT_PUBLIC_APP_URL` deve ser exatamente `https://maeaps.vercel.app`.

## Validação

Execute `npm test`, `npm run typecheck`, `npm run lint` e `npm run build`. Execute `db reset` e testes SQL/RLS somente no GitHub Actions. Publique migrations incrementais somente após revisão e backup; o snapshot estrutural não deve ser reaplicado automaticamente no V3 remoto.

Para a V1, a aplicação remota é uma operação manual e controlada, realizada
somente depois de CI verde, backup verificado e revisão humana:

1. executar `supabase migration list`;
2. executar `supabase db push --dry-run`;
3. confirmar que as três migrations pendentes são, exatamente:
   - `20260930010500_dashboard_practice_totals.sql`;
   - `20260930013000_protect_last_active_admin.sql`;
   - `20260930014500_reconcile_production_functions.sql`;
4. aplicar apenas essas migrations pelo fluxo incremental controlado;
5. nunca executar `db reset` no remoto;
6. nunca aplicar `supabase/seed.sql` em produção nem usar `--include-seed`.

A migration `20260930014500_reconcile_production_functions.sql` é a
reconciliação forward-only das RPCs canônicas diante da colisão histórica de
versionamento da migration `20260929004905`; ela não deve ser omitida, reescrita
nem substituída por alteração retroativa de migration já aplicada.

O workflow **MAE APS - Validacao V1** executa, nesta ordem, `npm ci`, testes, TypeScript, ESLint, build do Next.js, Supabase local, reconstrução completa por migrations e testes SQL/RLS. Ele roda em pull requests e pushes para `main` e também pode ser iniciado manualmente. O workflow separado **MAE APS - CodeQL** analisa somente JavaScript/TypeScript com as consultas padrão de segurança, sem duplicar a função com Semgrep.

Na sequência, a mesma instância local do Supabase recebe usuários e dados
estritamente sintéticos. O Playwright valida autenticação, autorização,
dashboard, filtros, importação e logout em Chromium. O runner recusa qualquer
URL de aplicação, banco ou Supabase fora de loopback e abre um servidor isolado
na porta 3100; ele não pode ser usado contra Preview ou Produção.

O caminho canônico para executar a camada completa é abrir um pull request: o
runner Linux do GitHub fornece Docker e instala o Chromium de forma efêmera. Em
uma máquina sem Docker ou com pouco espaço, valide apenas a descoberta dos
cenários, sem baixar navegador:

```bash
npm run test:e2e:list
```

Em uma máquina que já tenha Docker e espaço disponível, a execução completa é
opcionalmente:

```bash
npm run db:start
npx playwright install chromium
npm run test:e2e
```

Para a execução completa local, é necessário manter o Docker ativo. A chave privilegiada local é descoberta em
tempo de execução e existe apenas nos processos Node/Next; ela nunca usa o
prefixo `NEXT_PUBLIC_` nem é enviada ao navegador.

## Sentry

O SDK fica inativo quando não há DSN. Para ativá-lo em Preview/Produção, crie um
projeto Next.js no Sentry e configure na Vercel:

- `NEXT_PUBLIC_SENTRY_DSN` e `SENTRY_DSN` com a DSN do projeto;
- `SENTRY_AUTH_TOKEN`, `SENTRY_ORG` e `SENTRY_PROJECT` somente no ambiente de
  build, para publicar source maps privados.

O token de upload não pode ter prefixo `NEXT_PUBLIC_`. Mantenha `sendDefaultPii`
desabilitado também no projeto Sentry e habilite as regras server-side de
scrubbing como segunda barreira. A aplicação não habilita Session Replay,
profiling ou tracing nesta V1; captura apenas exceções. Antes de liberar, gere
uma exceção sintética em Preview e confirme que e-mail, cookies, tokens, query
string, nomes de XLSX e payloads SIAPS não aparecem no evento. Não faça esse
teste diretamente em Produção.

## Fluxo de produção

O fluxo obrigatório é:

1. criar uma branch de feature ou integração;
2. abrir pull request para `main`;
3. aguardar o check **Validar aplicacao, migrations e RLS** concluir com sucesso;
4. fazer o merge somente com o CI verde;
5. permitir que a Vercel promova o deployment do commit mesclado para o domínio de produção somente após o mesmo check ficar verde nesse commit.

Não há deploy customizado no GitHub Actions. A integração Git da Vercel continua responsável pelo build e pelo deployment, sem `VERCEL_TOKEN`, `VERCEL_ORG_ID` ou `VERCEL_PROJECT_ID` no repositório. O build da Vercel pode iniciar em paralelo ao CI; o Deployment Check é o que impede a atribuição do domínio de produção a um commit com validação pendente ou vermelha.

## Configuração manual no GitHub

No repositório GitHub:

1. acesse **Settings → Rules → Rulesets** e crie ou edite a regra que atinge a branch `main`; em interfaces que ainda usam a configuração anterior, use **Settings → Branches → Branch protection rules**;
2. exija pull request antes de alterações em `main`;
3. habilite **Require status checks to pass** e **Require branches to be up to date before merging**;
4. selecione como obrigatórios exatamente os checks **Validar aplicacao, migrations e RLS** e **Analisar JavaScript e TypeScript**;
5. bloqueie force-push e exclusão da branch e desabilite bypass da regra para quem também deve obedecer ao processo de release.

O nome do check só aparece na lista após ao menos uma execução do workflow. Não renomeie o job sem atualizar a regra do GitHub e o Deployment Check da Vercel.

Em **Security → Code scanning**, confirme que não há duas configurações CodeQL
ativas. Este repositório usa o workflow avançado `codeql.yml`; se o setup padrão
já estiver ativo, desative um dos dois para não duplicar a mesma análise. Em
repositório privado, confirme também que o plano/organização habilita CodeQL
antes de tornar o check obrigatório.

## Configuração manual na Vercel

No projeto do MAE APS na Vercel:

1. em **Settings → Git**, confirme que o projeto está conectado ao repositório correto;
2. em **Settings → Environments → Production → Branch Tracking**, defina `main` como Production Branch e mantenha **Automatic Aliasing** habilitado;
3. em **Settings → Deployment Checks**, escolha **Add Checks → GitHub**;
4. selecione **Validar aplicacao, migrations e RLS** e **Analisar JavaScript e TypeScript**, marque ambos como obrigatórios e aplique-os ao ambiente Production;
5. após a primeira execução, confirme em um deployment que a promoção para o domínio oficial permanece bloqueada até o check concluir com sucesso.

Não use **Force Promote** como fluxo normal, pois ele contorna o gate. Nenhuma credencial nova é necessária: a Vercel lê o resultado pela integração GitHub já conectada.

Se **Deployment Checks** não estiver disponível ou não conseguir observar os
dois jobs do GitHub, não mantenha a promoção automática sem proteção. Em
**Production → Branch Tracking**, desative **Auto-assign Custom Production
Domains**. O merge continuará criando um deployment em estado staged; promova
manualmente somente o deployment do mesmo commit depois que os dois checks de
`main` estiverem verdes. Use um dos dois fluxos — Deployment Checks com alias
automático ou promoção manual sem alias automático — nunca o alias automático
sem gate.
