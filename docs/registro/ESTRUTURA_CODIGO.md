# Estrutura do código

## Números

| Item | Quantidade |
|---|---|
| Arquivos TypeScript / TSX | 60 |
| Linhas de TypeScript / TSX (aplicação + testes) | 6.617 |
| Migrations SQL | 8 arquivos, 2.193 linhas |
| Testes SQL (pgTAP) | 4 arquivos, 893 linhas |
| Rotas da aplicação | 19 |
| Schemas de banco | 6 |
| Asserções automatizadas | 202 (110 TypeScript + 92 SQL) |

## Organização

```
.
├── src/
│   ├── app/                    rotas (Next.js App Router)
│   │   ├── (auth)/             cadastro, login, recuperação, aprovação
│   │   ├── (sistema)/          área privada, dividida por perfil
│   │   ├── auth/callback/      troca do código OAuth por sessão
│   │   ├── acesso-negado/  erro/  page.tsx  layout.tsx
│   ├── components/auth/        formulários e moldura de autenticação
│   ├── config/env.ts           validação do ambiente na inicialização
│   └── lib/
│       ├── admin/              situação do perfil e ações disponíveis
│       ├── auth/               guards, papéis, redirecionamento seguro
│       ├── gestao/             leitura do painel institucional
│       ├── professional/       carteira e leitura da planilha do PEC
│       ├── siaps/              reconhecimento e leitura do relatório oficial
│       ├── supabase/           clientes de servidor e de navegador
│       └── validation/         esquemas Zod de entrada
├── supabase/
│   ├── migrations/             evolução do banco, imutável e ordenada
│   └── tests/                  testes pgTAP com troca real de papel
├── tests/                      testes de unidade (Vitest)
├── docs/
│   ├── IMPLEMENTATION_CONTRACT.md   especificação normativa
│   ├── SECURITY_DEBT.md             dívida técnica registrada
│   ├── VERIFICACAO_V3.md            evidências da bateria de verificação
│   └── registro/                    este pacote
└── scripts/gerar-pacote-registro.sh
```

## Arquivos de referência

### Autorização

| Arquivo | Papel |
|---|---|
| `src/lib/auth/guards.ts` | `evaluateActiveProfile` — a precedência das negativas, em um único lugar |
| `src/lib/auth/route-guard.ts` | Converte a negativa em redirecionamento |
| `src/lib/auth/navigation.ts` | Destino por motivo de negativa e por papel; nega por padrão diante de código desconhecido |
| `src/lib/auth/safe-redirect.ts` | `safeNext` — impede redirecionamento para fora da origem canônica |
| `src/config/env.ts` | Recusa iniciar sem `NEXT_PUBLIC_APP_URL`; recusa chave `service_role` no ambiente público |

### Indicador

| Arquivo | Papel |
|---|---|
| `src/lib/siaps/parse.ts` | Reconhecimento obrigatório da fonte, leitura estrita das linhas, checksum, recomposição e classificação |
| `src/lib/siaps/workbook.ts` | Leitura do XLSX com limite de tamanho |
| `src/lib/gestao/queries.ts` | Leitura das *views* de `analytics_gestao`. Não recompõe nada |
| `supabase/migrations/20260909030000_core_territory_and_siaps.sql` | Território, base bruta, fatos, motor e visões do C3 |

### Módulo Profissional

| Arquivo | Papel |
|---|---|
| `src/lib/professional/pec/columns.ts` | Reconhecimento tolerante de cabeçalho por conceito |
| `src/lib/professional/pec/parse.ts` | Validação estrita de valores e desduplicação |
| `src/lib/professional/pec/csv.ts` | Leitura de CSV com detecção de separador e remoção de BOM |
| `supabase/migrations/20260909020000_professional_module.sql` | Tabelas, gatilhos de propriedade, importação transacional e *views* |

## Migrations

As migrations são **imutáveis**. Uma migration aplicada nunca é editada; uma
correção é uma migration nova. É o que mantém o histórico do banco auditável e
o que permite reconstruir qualquer estado anterior.

| Ordem | Arquivo | Conteúdo |
|---|---|---|
| 1 | `20260908230613_foundation_schemas_profiles.sql` | Schemas, perfis, tipos e exposição da Data API |
| 2 | `20260908230633_authorization_audit_rls.sql` | Funções de autorização, auditoria, concessões e RLS |
| 3 | `20260908230654_private_storage_buckets.sql` | Buckets privados e políticas de Storage |
| 4 | `20260908230901_advisor_hardening.sql` | Índice de chave estrangeira e política de leitura unificada |
| 5 | `20260909004056_fix_profile_lifecycle_guards.sql` | Guardas de ciclo de vida e invariante do último administrador |
| 6 | `20260909010000_admin_profile_actions.sql` | Ações administrativas granulares com trava e invariante |
| 7 | `20260909020000_professional_module.sql` | Módulo Profissional completo |
| 8 | `20260909030000_core_territory_and_siaps.sql` | Território, ingestão SIAPS e motor C3 |

A ordem foi verificada: as oito aplicam limpo, em sequência, sobre um banco
vazio. O procedimento está em `../VERIFICACAO_V3.md`.

## Testes

| Arquivo | Asserções | Cobre |
|---|---|---|
| `tests/auth/guards.test.ts` | 13 | Precedência das negativas e guards por papel |
| `tests/auth/safe-redirect.test.ts` | 11 | Redirecionamento aberto, incluindo as formas com barra invertida |
| `tests/auth/access-fallback.test.ts` | 6 | Destino de negativa e reautenticação na troca de senha |
| `tests/config/env.test.ts` | 7 | Validação do ambiente |
| `tests/admin/status.test.ts` | 17 | Situação do perfil, ações oferecidas, recusa de papéis legados |
| `tests/professional/pec-parser.test.ts` | 23 | Cabeçalho, valores, datas, CSV e desduplicação |
| `tests/siaps/parser.test.ts` | 33 | Reconhecimento da fonte, checksum, recomposição e faixas |
| `supabase/tests/001_foundation_rls.test.sql` | 29 | Schemas, RLS, isolamento entre perfis, invariante do administrador |
| `supabase/tests/002_admin_actions.test.sql` | 15 | Cada ação administrativa e suas recusas |
| `supabase/tests/003_professional_isolation.test.sql` | 24 | Isolamento entre profissionais, importação PEC, não contaminação do indicador |
| `supabase/tests/004_siaps_c3_engine.test.sql` | 24 | Motor C3 contra valores reais do SIAPS, exclusão de policlínica, não criação de pacientes |

Os testes SQL trocam de papel de verdade (`set local role authenticated` com
`request.jwt.claim.sub`). O RLS é exercido, não simulado. Os testes do motor C3
usam valores reais publicados pelo SIAPS para Campina Grande, de modo que uma
mudança na fórmula falha contra a fonte oficial, não contra um número inventado.
