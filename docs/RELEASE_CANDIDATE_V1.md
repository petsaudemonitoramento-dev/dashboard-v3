# Release Candidate — MAE APS V1

## Identificação

- Data: **01/10/2026**.
- Branch: `codex/hardening-v1-integrado`.
- SHA funcional auditado e testado: `902a745bbefcd3e3ce9264705aed318a46d38b3c`.
- Destino futuro do PR: `main`.
- Estado: **candidato para CI e smoke; ainda não liberado para merge, produção
  ou tag**.

O SHA acima identifica o conteúdo funcional e o checklist de smoke que receberam
a validação local descrita neste documento. O SHA final da branch após o commit
desta própria documentação deve ser conferido no PR e no deployment.

## Funcionalidades congeladas

- autenticação Supabase SSR, recuperação de senha e Google OAuth/PKCE;
- RBAC somente com `admin`, `gestao` e `leitura`, sem coordenador distrital;
- visão municipal para Gestão e Leitura conforme permissões;
- Dashboard executivo C3, resumo, indicadores, comparativos e UBS/equipes;
- filtros Distrito → UBS → Equipe, `unknown` restrito a fatos sem distrito e
  normalização server-side de URL;
- agregações A–K pela RPC `SECURITY INVOKER`, sem truncamento em 1.000 linhas;
- importação exclusivamente XLSX, síncrona e atômica, com pré-visualização,
  SHA-256, duplicidade e limites de 10 MiB, 10.000 linhas e JSON de 4 MiB;
- Território com vigência histórica e ajuste cadastral de UBS com dupla
  confirmação;
- Administração paginada, auditada e protegida contra remoção do último admin;
- auditoria sem IP, User-Agent ou identificador de sessão;
- Sentry sanitizado, CSP incremental e headers HTTP existentes preservados;
- Playwright/axe, k6 seguro, CodeQL e gate de validação da V1.

O modelo permanece agregado por equipe/competência do SIAPS/SISAB. Não há
prontuário nem dado clínico individual.

## Migrations do RC

Nenhuma migration histórica foi editada. As três migrations incrementais,
ainda **não aplicadas ao Supabase remoto**, são:

1. `20260930010500_dashboard_practice_totals.sql` — agrega somente A–K, usa
   `SECURITY INVOKER`, `search_path` vazio, respeita RLS e faz parâmetros
   contraditórios de `unknown` retornarem vazio.
2. `20260930013000_protect_last_active_admin.sql` — mantém autorização no banco,
   serializa a RPC com advisory lock transacional, revalida o admin após o lock,
   impede desativação/rebaixamento do último admin e audita apenas a transação
   concluída.
3. `20260930014500_reconcile_production_functions.sql` — reconciliação
   forward-only das RPCs canônicas após colisão histórica do versionamento
   `20260929004905`; restaura publicação SIAPS, identidade e território, remove
   a assinatura cadastral legada, preserva confirmações, `auth.uid()`,
   `search_path`, grants/revokes e fechamento das ingestões legadas.

A revisão final não identificou vulnerabilidade que justificasse uma quarta
migration. O fluxo remoto obrigatório é: CI verde → backup →
`supabase migration list` → `supabase db push --dry-run` → conferir exatamente
as três migrations acima → aplicação incremental por um responsável. Nunca
usar `db reset`, seed ou `--include-seed` no remoto.

## Verificações locais concluídas

| Verificação | Resultado em 01/10/2026 |
| --- | --- |
| `npm test` | 19 arquivos, **149/149** testes aprovados |
| `npm run test:volume` | **5/5** aprovados: 1k, 5k, 10k, rejeição de 10.001 e limite UTF-8 de 4 MiB |
| `npm run typecheck` | aprovado, zero erro |
| `npm run lint` | aprovado, zero erro |
| `npm run test:e2e:list` | **22** testes descobertos em 6 arquivos |
| `git diff --check` | aprovado |
| geração de registro | pacote de teste não definitivo com 30 origens, validado e removido |
| `npm run build` | não aprovado localmente; Turbopack recusou a junction externa de `node_modules` |

Medições indicativas da última rodada de volume:

| Linhas | XLSX | Parsing | Validação | Delta de heap aproximado | JSON |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 1.000 | 186.676 B | 564,90 ms | 49,27 ms | -3.036.864 B | 119.857 B |
| 5.000 | 889.913 B | 2.027,86 ms | 81,35 ms | 22.585.728 B | 611.857 B |
| 10.000 | 1.768.547 B | 1.436,50 ms | 227,00 ms | 4.461.696 B | 1.226.862 B |

O delta de heap varia com coleta de lixo e não é um SLO.

## Verificações pendentes no GitHub

O computador local não possui Docker utilizável nem espaço para duplicar
`node_modules`. Permanecem como gates obrigatórios no runner limpo:

- build Next/Turbopack;
- Supabase local e reconstrução completa por migrations;
- **131** asserções pgTAP/RLS declaradas (21 + 44 + 16 + 50);
- **22** Playwright/axe reais em Chromium;
- CodeQL JavaScript/TypeScript;
- Vercel Preview do mesmo commit.

Nenhum desses itens deve ser marcado como verde com base apenas na inspeção
local. O PR não pode ser mesclado enquanto os checks não estiverem verdes.

## Smoke test

O procedimento está em `docs/SMOKE_TEST_V1.md` e ainda está **pendente**.
Preview/Staging cobre Auth, papéis, filtros, análises, importação sintética,
Administração, Território, auditoria, Sentry, headers e acessibilidade manual.
Após merge, produção recebe somente smoke não destrutivo: login, autorização,
dashboard, filtros, logout, headers, logs e Sentry. É proibido importar arquivo
de teste, alterar território ou alterar perfil real durante o smoke de produção.

## Registro de software

Os scripts de pacote/hash e `docs/registro/` estão preparados. Uma geração de
teste não definitiva foi executada fora do repositório e removida. O pacote
final, a tag anotada `v1.0.0` e o hash definitivo **não foram gerados**.
As pendências institucionais do NITT continuam abertas. O fluxo final é:
CI verde → Preview aprovado → smoke aprovado → merge aprovado → `main`
validada → freeze → pacote/revisão → tag → manifesto/hash → material do registro.

## Limitações e riscos conhecidos

- build local não verificável enquanto `node_modules` for junction externa;
- pgTAP/RLS, Playwright/axe e CodeQL dependem do PR/runner;
- ruleset do GitHub e Deployment Checks da Vercel exigem confirmação manual;
- migrations remotas, backup e smoke não foram executados;
- Google OAuth, SMTP, recuperação completa, cookies HTTPS, refresh e Leaked
  Password Protection dependem da configuração hospedada;
- Sentry precisa de evidência real de scrubbing em Preview;
- não se declara conformidade WCAG completa; revisão manual continua exigida;
- k6 tem cenários seguros de 10/50/100 VUs, mas ainda não possui baseline de
  staging e nunca deve apontar para produção sem autorização explícita;
- a página principal de Gestão continua extensa; a decomposição adicional foi
  adiada para não arriscar o dashboard visual recente durante o freeze;
- política institucional de retenção de auditoria e de limite absoluto/inativo
  de sessão ainda precisa de decisão formal.

## Rollback esperado

- Antes do merge: corrigir na mesma branch; não contornar check ou alerta real.
- Aplicação: se a promoção falhar, não atribuir o domínio oficial ou restaurar
  o alias ao deployment anterior validado pela Vercel.
- Banco: tirar backup antes das migrations; nunca executar reset/desfazer
  destrutivamente. Se houver defeito de schema/RPC, interromper a promoção e
  preparar uma nova migration forward-only revisada, com plano de restauração.
- Registrar commit, deployment, migrations, responsáveis, horário, evidências
  e decisão de rollback no processo de release.

## Explicitamente fora da V1

- coordenador distrital;
- segregação territorial por usuário;
- Redis ou Memcached;
- filas, workers e background jobs;
- upload para Storage com processamento assíncrono;
- materialized views sem ganho demonstrado;
- virtualização desnecessária;
- CSV;
- dados individuais de pacientes ou prontuários;
- arquitetura/testes para milhões de registros;
- carga contra produção;
- chaos engineering, SonarQube e SAST redundante ao CodeQL.

## Critérios para declarar freeze

- [ ] PR aberto para `main` e revisão concluída.
- [ ] Validação V1, CodeQL e Vercel Preview verdes no mesmo commit.
- [ ] Smoke de Preview/Staging aprovado e evidenciado.
- [ ] Backup e aplicação controlada das três migrations aprovados.
- [ ] Commit final de `main` e deployment de produção conferidos.
- [ ] Smoke não destrutivo de produção aprovado.
- [ ] Pendências institucionais de versão/autoria/titularidade resolvidas.
- [ ] Freeze autorizado antes da geração final, tag e hash.
