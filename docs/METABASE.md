# Metabase — integração complementar ao MAE APS

## Situação em 29/10/2026

- **Concluído:** banco oficial `dashboard-v3` (Supabase `nyexakdyxtstcyycmlng`), views `analytics.dashboard_*` existentes e populadas.
- **Concluído:** role PostgreSQL dedicada `mae_metabase_reader` criada no banco oficial pela migration `20261029172844_mae_aps_metabase_reader_read_only`, com `NOLOGIN`, sem senha, grants mínimos e RLS específicas. Não foi alterada a autenticação das pessoas usuárias.
- **Concluído:** SQL das seis perguntas iniciais documentado em [METABASE_PERGUNTAS.md](METABASE_PERGUNTAS.md).
- **Pendente:** identificar e autenticar uma instância Metabase persistente (institucional ou própria), habilitar LOGIN com segredo definido por canal seguro, conectar o banco, criar/publicar as perguntas e validar contra o dashboard do MAE APS.
- **Não executado:** nenhuma conexão à instância Metabase, painel criado nessa instância, incorporação no Next.js ou deploy do aplicativo. Não marcar a integração como concluída antes desse teste.

## Objetivo e arquitetura

O Metabase complementa o Dashboard Next.js do **MAE APS — gestão**; não substitui o dashboard, não recebe credenciais do Supabase Auth e não acessa prontuário individual nem tabelas brutas SIAPS, perfis, auditoria, `auth.users` ou `study`.

Fonte de BI: views do schema `analytics` com `security_invoker=true`. O papel Postgres de BI precisa também de `SELECT` nas tabelas agregadas e dimensões `core` que sustentam as views. O usuário de conexão não deve poder modificar dados.

## Views disponíveis

| View | Granularidade | Colunas principais |
| --- | --- | --- |
| `dashboard_team_directory` | equipe atual | `district_id`, `district_name`, `establishment_id`, `cnes`, `establishment_name`, `team_id`, `ine`, `team_name` |
| `dashboard_c3_team_monthly` | equipe e competência | dimensões territoriais, `points_total`, `denominator`, `c3`, `classification` |
| `dashboard_c3_practices` | prática A–K por equipe e competência | dimensões, `practice_code`, `fulfilled`, `denominator` |
| `dashboard_competencies` | competência municipal | `points_total`, `denominator`, `c3` |
| `dashboard_c3_establishment_monthly` | UBS e competência | dimensões, `points_total`, `denominator`, `c3`, `teams` |
| `dashboard_c3_district_monthly` | distrito e competência | dimensões, `points_total`, `denominator`, `c3`, `establishments`, `teams` |
| `dashboard_c3_practice_summary` | prática, UBS e competência | dimensões, `practice_code`, `fulfilled`, `denominator` |

`competency` é o primeiro dia do mês de referência. CNES e INE são identificadores de negócio, não dados pessoais. UUIDs são chaves internas.

## Regra matemática obrigatória

Sempre que agregar mais de uma equipe/UBS/distrito, calcular:

```sql
SUM(points_total) / NULLIF(SUM(denominator), 0)
```

**Nunca `AVG(c3)`.** Denominador zero deve ser tratado como valor nulo e apresentado como "Sem população elegível". Filtros usuais: competência, distrito, UBS, CNES, equipe, INE, prática e classificação.

## Permissões e proteção

A role `mae_metabase_reader` é sem LOGIN e sem senha de propósito. O arquivo versionado [migration Metabase](../supabase/migrations/20261029172844_mae_aps_metabase_reader_read_only.sql) define acesso mínimo e políticas RLS, testados por [005_metabase_reader.test.sql](../supabase/tests/005_metabase_reader.test.sql). O template original [metabase-reader-template.sql](metabase-reader-template.sql) permanece apenas como referência histórica; não reaplicar sem verificar a migration atual.

Na produção, a role não possui `SELECT` em `auth.users`, `app.profiles`, `audit.events`, `siaps.imports` ou `public.dashboard_competencies` (verificado por consulta de privilégios). A role não é superuser, não usa bypass RLS e inicia transações como read-only.

Nunca conectar usando `postgres`, `service_role`, chave secreta do Supabase ou login individual da gestão.

## Ativação pendente — instância de Metabase

1. Confirmar a **URL da instância Metabase** e o acesso administrativo autorizado. Sem instância hospedada e acessível, a preparação do banco não significa que o Metabase já esteja em operação.
2. Configurar uma senha forte para `mae_metabase_reader` fora do Git, do chat e dos logs; habilitar `LOGIN` apenas quando a configuração de rede/SSL for efetivada. Guardar segredo exclusivamente no gerenciador de credenciais da instância.
3. Na instância, **Admin → Databases → Add a database** → driver PostgreSQL: banco `postgres`, usuário `mae_metabase_reader`, hostname de conexão direta/pooler fornecido pelo dashboard Supabase desse projeto e SSL habilitado (preferir verificação da identidade com certificado).
4. Sincronizar **apenas** o schema `analytics` em Metabase; usar as sete views `dashboard_*`; ocultar as tabelas de suporte `c3_team_monthly` e `c3_practice_counts` no modelo de exploração. A conexão precisa de `USAGE` em `core` por causa de `security_invoker`, mas não sincronizar `core` na interface.
5. Criar as perguntas descritas em [METABASE_PERGUNTAS.md](METABASE_PERGUNTAS.md) e montar um dashboard com filtros de competência/distrito/UBS.
6. Comparar os resultados do Metabase com o painel MAE APS no mesmo mês e recorte; checar zeros, nulos, nenhum dado e histórico. Verificar isolamento do banco e usuários Metabase autorizados.
7. Manter **public sharing desativado**. Se posteriormente for incorporado dentro do MAE APS, usar integração autenticada com JWT assinado pelo servidor e revisar as permissões dos usuários e parâmetros bloqueados antes do deploy. Não expor segredo no navegador.

Para PostgreSQL/Supabase no Metabase: https://www.metabase.com/docs/latest/databases/connections/postgresql

As views não são materializadas; novos uploads SIAPS publicados ficam disponíveis após commit. Não habilitar refresh/materialização sem evidência de gargalo.
