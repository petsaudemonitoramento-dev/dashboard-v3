# Relatório de hardening e preparação da V1

Data da validação local: 30/09/2026.

## Escopo preservado

- `gestao` e `leitura` continuam com visão municipal conforme suas permissões;
- não existe coordenador distrital, vínculo usuário → distrito ou segregação
  territorial por usuário;
- os dados continuam agregados por equipe SIAPS/SISAB, sem prontuário
  individual;
- não foram adicionados Redis, cache distribuído, filas, workers, jobs em
  background, Storage assíncrono, virtualização, materialized views, chaos
  engineering, SonarQube ou suporte CSV;
- nenhuma migration antiga foi alterada e nenhuma proteção RLS foi removida;
- não houve deploy, push remoto, aplicação de migration remota ou alteração
  destrutiva.

## Revisão arquitetural

O MAE APS permanece uma aplicação Next.js App Router com renderização e guards
no servidor, Supabase Auth/SSR, PostgreSQL com RLS e RPCs estreitas, deploy pela
integração Git da Vercel e importação XLSX síncrona/atômica. A chave privilegiada
é utilizada apenas em módulos `server-only` para administração de `auth.users`
e publicação já validada; ela não é enviada ao navegador.

As tabelas operacionais estão separadas nos schemas `app`, `core`, `siaps`,
`analytics`, `study` e `audit`. As views do dashboard usam `security_invoker` e
as permissões de Gestão/Leitura continuam sendo determinadas pela RLS. O fluxo
oficial de importação publica em uma única transação PostgreSQL e já gerava um
evento durável de conclusão.

## Correções e adições

| Etapa | Problema confirmado | Resultado implementado |
| --- | --- | --- |
| Filtros | URLs e mudanças de filtro podiam formar Distrito/UBS/Equipe incompatíveis; `unknown` podia ampliar o recorte | normalização server-side, cascata de limpeza e opções derivadas somente do pai selecionado |
| CI | GitHub Actions e promoção Vercel podiam avançar sem um gate comum | workflow único de validação completa, job estável para ruleset/Deployment Check e documentação dos ajustes externos |
| Volume | não havia evidência para 1k/5k/10k linhas | gerador XLSX sintético, parsing, validação, heap aproximado, bytes XLSX/JSON e testes de limites |
| Importação | XLSX aceito no browser podia produzir request inevitavelmente recusado | limites centralizados: XLSX 10 MiB, 10.000 linhas e JSON 4 MiB, medido no cliente e repetido na API, com erro claro |
| E2E | Vitest/pgTAP não cobriam a jornada real | Playwright adicional com usuários e dados estritamente sintéticos, travado para loopback |
| SAST | não havia análise estática de segurança no repositório | CodeQL para JavaScript/TypeScript em PR, `main` e agenda semanal; Semgrep não foi adicionado por redundância |
| Observabilidade | exceções não tinham coleta central sanitizada | Sentry opcional para browser, servidor e edge; sem PII padrão, tracing, replay ou profiling; scrub adicional de requests, tokens, e-mail, XLSX e payloads |
| Acessibilidade | faltavam auditoria automática, foco persistente, alternativas aos gráficos e semântica em alguns fluxos | axe no Playwright, skip link, foco, labels, `aria-live`, tabelas, diálogo nativo e tabelas alternativas aos gráficos |
| Paginação | Administração carregava até 1.000 usuários e todos os perfis | paginação server-side de 50 usuários e consulta apenas dos perfis da página |
| Analytics | A–K podia retornar 1.100 linhas por lote e ser truncado pelo limite PostgREST de 1.000 | RPC `security invoker` que retorna no máximo 11 totais; views agregadas reaproveitadas; normalização e carregamento crítico extraídos sem substituir o dashboard visual mais recente |
| Carga | não havia cenário pequeno e seguro | k6 para 10/50/100 VUs, somente leituras/401, bloqueio explícito de produção e autorização literal para staging remoto |
| Autenticação | configurações remotas não estavam inventariadas e era possível tentar remover o último admin | checklist Auth/PKCE/OAuth/sessões e RPC serializada que preserva ao menos um administrador ativo |
| HTTP | CSP protegia apenas framing | CSP incremental com `base-uri`, `form-action`, `frame-ancestors` e `object-src`, mantendo os demais headers existentes |
| Auditoria | faltava evidência explícita sobre privacidade e eventos de importação | testes do evento concluído e metadados mínimos; decisão documentada de não coletar IP, User-Agent ou sessão e de não criar eventos redundantes/orfãos |

## Arquivos principais por etapa

- filtros e dashboard: `src/lib/analytics/dashboard-filters.ts`,
  `dashboard-data.ts`, `dashboard-model.ts`, `dashboard-charts.ts`,
  `src/components/dashboard/dashboard-filters.tsx` e `gestao/page.tsx`;
- importação: `src/lib/siaps/limits.ts`, `errors.ts`, `parser.ts`, `compact.ts`,
  `src/lib/http/request-body.ts`, `src/app/api/importacoes/route.ts` e
  `src/components/siaps/import-wizard.tsx`;
- administração: `src/lib/administration/*` e páginas/actions da Administração;
- E2E/acessibilidade: `playwright.config.ts`, `scripts/run-playwright-local.mjs`,
  `tests/e2e/*` e `supabase/seed.sql`;
- Sentry: `instrumentation-client.ts`, `src/instrumentation.ts`,
  `sentry.server.config.ts`, `sentry.edge.config.ts` e
  `src/lib/observability/sentry-privacy.ts`;
- segurança HTTP: `src/config/security-headers.ts` e `next.config.ts`;
- CI/SAST: `.github/workflows/validate-v1.yml` e `codeql.yml`;
- carga: `tests/load/mae-aps.js`, `safety.js` e
  `docs/TESTE_DE_CARGA.md`.

## Testes criados ou ampliados

- Vitest: filtros/normalização, modelo do dashboard, paginação e montagem de
  usuários, ambiente E2E, privacidade Sentry, headers HTTP, corpo da API,
  limites/volume e travas do k6;
- Playwright: login, rota protegida, logout, recuperação, Gestão, Leitura,
  Administração sem permissão ao dashboard, importação válida/inválida,
  cascata dos filtros, `unknown`, URL incompatível, dashboard, axe, teclado,
  foco, diálogo e headers HTTP;
- pgTAP: RPC A–K, RLS por papel, privilégios, último admin, concorrência
  serializada, auditoria de importação e metadados mínimos.

## Resultados locais

| Comando | Resultado |
| --- | --- |
| `npm test` | 19 arquivos, 149 testes aprovados |
| `npm run test:volume` | 5 testes aprovados |
| `npm run typecheck` | aprovado |
| `npm run lint` | aprovado |
| `npm run build` | bloqueado localmente: o Turbopack rejeita a junction de `node_modules` usada para não duplicar dependências no disco; execução exata pendente no runner limpo do CI |
| `npm run test:e2e:list` | 22 testes encontrados em 6 specs |
| pgTAP/RLS | 131 asserções declaradas (21 + 44 + 16 + 50), execução pendente no CI |
| Playwright/axe real | execução pendente no CI |
| CodeQL | execução pendente no PR/CI |
| k6 | script e travas validados; carga real pendente em staging autorizado |

Docker e Chromium não foram instalados ou iniciados nesta máquina. O desvio
adotado é intencional: o runner Ubuntu efêmero do GitHub executa Supabase local,
rebuild por migrations, pgTAP/RLS, instala Chromium e roda Playwright/axe. O
computador local usa Vitest, typecheck, lint e listagem E2E. O build local usa
dependências por junction por falta de espaço; o Turbopack bloqueia esse arranjo,
portanto o build exato permanece como gate obrigatório no runner limpo do CI.

### Medições sintéticas da importação

Uma execução local, sem outros processos controlados e sem limiar rígido de
tempo/memória, produziu:

| Linhas | XLSX | Parsing | Validação | Delta de heap aproximado | JSON |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 1.000 | 186.676 B | 589,15 ms | 46,09 ms | -1.721.432 B | 119.857 B |
| 5.000 | 889.913 B | 2.075,75 ms | 105,41 ms | 22.005.136 B | 611.857 B |
| 10.000 | 1.768.547 B | 2.984,38 ms | 321,64 ms | 1.587.904 B | 1.226.862 B |

O delta de heap é apenas indicativo e pode ser negativo por coleta de lixo.
Funcionalmente, 10.001 linhas são recusadas e um payload UTF-8 acima de 4 MiB
também é recusado mesmo com no máximo 10.000 linhas.

## Migrations novas

1. `20260930010500_dashboard_practice_totals.sql`: cria somente a função
   `analytics.dashboard_c3_practice_totals`; é `SECURITY INVOKER`, respeita RLS,
   fecha combinação contraditória de distrito e retorna no máximo A–K.
2. `20260930013000_protect_last_active_admin.sql`: substitui incrementalmente
   `public.manage_profile`, serializa alterações administrativas e impede
   desativar/rebaixar o último admin ativo.
3. `20260930014500_reconcile_production_functions.sql`: reconcilia, de forma
   forward-only, duas linhagens que haviam usado o mesmo timestamp de migration;
   restaura as RPCs canônicas de publicação, identidade e território e remove a
   assinatura legada de identidade sem as duas confirmações.

As migrations são compatíveis com o código anterior, não criam papel novo e não
alteram as políticas territoriais. Nenhuma foi aplicada ao projeto remoto.

## CI e produção

O job **Validar aplicacao, migrations e RLS** preserva, nesta ordem, `npm ci`,
Vitest, TypeScript, ESLint, build Next, Supabase local, rebuild completo por
migrations, pgTAP/RLS, Chromium e Playwright/axe. O job separado **Analisar
JavaScript e TypeScript** usa CodeQL. Ambos rodam em PR e no commit mesclado em
`main`.

A Vercel continua responsável pelo build/deployment Git; não foram adicionados
tokens Vercel nem um segundo pipeline de deploy. A promoção precisa usar
Deployment Checks ou, se indisponíveis, produção staged com promoção manual.

## Configuração manual no GitHub

1. Rodar os workflows uma vez para os nomes dos checks aparecerem.
2. Criar ruleset ativo para `main`, exigir PR e branch atualizada.
3. Tornar obrigatórios **Validar aplicacao, migrations e RLS** e **Analisar
   JavaScript e TypeScript**.
4. Bloquear force-push/exclusão e remover bypass de quem deve seguir o release.
5. Confirmar que CodeQL está habilitado para o plano/repositório e que não há
   setup padrão e workflow avançado duplicando a análise.
6. Revisar e resolver qualquer alerta CodeQL antes do merge; não marcar alerta
   real como falso positivo apenas para liberar a versão.

## Configuração manual na Vercel

1. Confirmar `main` como Production Branch e o repositório correto.
2. Preferencialmente adicionar os dois jobs acima como Deployment Checks
   obrigatórios de Production, mantendo auto-alias somente com esse gate.
3. Se os checks não estiverem disponíveis, desligar **Auto-assign Custom
   Production Domains** e promover manualmente apenas o deployment do commit
   cujo CI de `main` esteja verde.
4. Confirmar `NEXT_PUBLIC_APP_URL`, URL/chave publicável Supabase e
   `SUPABASE_SECRET_KEY` server-side nos ambientes corretos; nunca prefixar a
   chave secreta com `NEXT_PUBLIC_`.
5. Para Sentry, configurar DSNs e, somente no build, `SENTRY_AUTH_TOKEN`,
   `SENTRY_ORG` e `SENTRY_PROJECT`; validar um erro sintético em Preview e
   confirmar ausência de PII/payload.
6. Não usar **Force Promote** como fluxo normal.

## Configuração manual no Supabase Dashboard

1. Após CI verde, backup verificado e revisão humana, executar
   `supabase migration list`.
2. Executar `supabase db push --dry-run` e confirmar que estão pendentes
   exatamente `20260930010500_dashboard_practice_totals.sql`,
   `20260930013000_protect_last_active_admin.sql` e
   `20260930014500_reconcile_production_functions.sql`.
3. Um único responsável aplica somente essas três migrations pelo fluxo
   incremental controlado, sem `--include-seed`, sem aplicar `supabase/seed.sql`
   em produção e nunca com `db reset` no remoto. A migration `014500` é a
   reconciliação forward-only das RPCs canônicas e da colisão histórica de
   versionamento; não deve ser omitida nem substituída pela edição de migration
   já aplicada.
4. Conferir Site URL e allow-list exata de `/auth/callback`, sem curingas amplos
   para Preview.
5. Conferir JWT de 3.600 s, rotação de refresh token e reuse interval de 10 s.
6. Conferir confirmação de e-mail, secure password change, cadastro anônimo e
   manual linking desativados, SMTP e rate limits.
7. Ativar Leaked Password Protection se o plano oferecer; se não oferecer,
   registrar a limitação, sem workaround improvisado.
8. Configurar Google Client ID/Secret e a callback Supabase no Google Cloud;
   testar OAuth/PKCE em staging.
9. Não definir timebox/inatividade até a instituição decidir política para
   turnos, equipamentos compartilhados e reautenticação. Esses controles também
   dependem do plano.

## Riscos remanescentes

- pgTAP/RLS, Playwright/axe e CodeQL ainda precisam de uma execução verde no
  GitHub; a listagem local não substitui a execução real;
- o build Turbopack precisa ser confirmado no runner, porque a validação local
  foi impedida pela junction externa de `node_modules`, não por erro de código;
- o gate de produção só passa a existir depois das configurações manuais de
  ruleset e Vercel;
- OAuth, SMTP, refresh, recuperação completa e cookies HTTPS dependem do projeto
  hospedado e precisam de smoke test em staging;
- Sentry precisa de validação real de scrubbing em Preview;
- os thresholds do k6 são guardas iniciais, não SLOs; faltam baselines de
  staging e observação conjunta de Vercel/Supabase;
- a auditoria não possui ainda política institucional formal de retenção;
- a auditoria axe não comprova conformidade WCAG completa; testes manuais com
  teclado e tecnologia assistiva continuam necessários;
- uma CSP completa com nonce/allow-list permanece pendente de Report-Only em
  staging;
- a decomposição adicional de `gestao/page.tsx` foi limitada para preservar o
  dashboard recente; helpers analíticos ainda podem ser consolidados ou removidos
  em uma etapa posterior, com cobertura visual.

## Itens deliberadamente adiados

- coordenador distrital e segregação territorial por usuário;
- Redis/Memcached, fila, worker, background job e upload assíncrono;
- virtualização das listas de 98 UBS/211 equipes;
- materialized views e novos índices sem `EXPLAIN ANALYZE` em volume real;
- Semgrep e SonarQube enquanto CodeQL cobrir o SAST necessário;
- eventos de importação iniciada/falha sem modelo transacional e finalidade
  institucional demonstrados;
- auditoria de exportação antes de existir uma exportação;
- limite absoluto/inatividade de sessão sem decisão institucional;
- CSP restritiva de scripts/conexões sem evidência de staging;
- CSV, prontuários individuais, milhões de registros e teste de carga em
  produção.

## Checklist para a tag `v1.0.0`

- [ ] revisar o diff e garantir que o working tree contém somente mudanças da V1;
- [ ] abrir PR de feature/integração para `main`;
- [ ] obter os dois checks obrigatórios verdes no PR;
- [ ] confirmar no log do CI: rebuild completo, 131 pgTAP, 22 Playwright/axe e build;
- [ ] revisar alertas CodeQL e artefatos Playwright, se houver;
- [ ] executar smoke de Preview/staging para Auth, papéis, filtros, importação,
      dashboard, logout, headers e evento Sentry sanitizado;
- [ ] opcionalmente registrar baseline k6 em staging autorizado, nunca produção;
- [ ] após CI verde, fazer backup do banco, executar `supabase migration list`
      e `supabase db push --dry-run`, confirmar exatamente as três migrations
      novas (`20260930010500_dashboard_practice_totals.sql`,
      `20260930013000_protect_last_active_admin.sql` e
      `20260930014500_reconcile_production_functions.sql`) e aplicá-las pelo
      fluxo incremental controlado, sem seed e sem `db reset` remoto;
- [ ] confirmar ruleset GitHub e um dos dois gates Vercel antes do merge;
- [ ] fazer merge e aguardar novamente os checks do commit em `main`;
- [ ] confirmar que o deployment promovido corresponde exatamente ao commit;
- [ ] executar smoke de produção não destrutivo e conferir logs/Sentry;
- [ ] após validar o commit final de `main`, declarar o freeze, executar
      `npm run registro:codigo` e revisar o pacote autoral gerado;
- [ ] garantir working tree limpo e criar a tag anotada `v1.0.0` no mesmo commit
      aprovado e registrado no cabeçalho do pacote;
- [ ] publicar a tag somente após autorização e então executar
      `npm run registro:hash -- --tag v1.0.0`;
- [ ] registrar release notes, migrations aplicadas, responsáveis, horário e
      plano de rollback.
