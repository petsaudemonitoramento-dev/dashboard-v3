# Metabase — preparação arquitetural

## Objetivo e arquitetura

O Metabase será uma camada analítica complementar ao Dashboard Next.js do MAE APS. Ele não substitui o Dashboard, não recebe credenciais do Supabase Auth e não deve consultar dados brutos do SIAPS, perfis, auditoria, `auth.users` ou o schema `study`.

A fonte estável para BI é o schema `analytics`. As views usam `security_invoker=true`: o usuário Postgres dedicado precisa de `SELECT` somente nas tabelas analíticas/dimensões que sustentam as views e nas próprias views. Nenhuma dessas relações contém prontuário ou informação clínica individual.

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

`competency` é o primeiro dia do mês de referência. CNES e INE são identificadores de negócio; UUIDs continuam sendo as chaves internas. `fulfilled` é a contagem atendida de uma prática A–K.

## Cálculo correto do C3

Ao agregar mais de uma equipe, UBS ou distrito, use sempre:

```text
SUM(points_total) / NULLIF(SUM(denominator), 0)
```

Nunca use `AVG(c3)` para agregação municipal ou territorial. A média simples dos percentuais muda o peso das populações elegíveis e produz resultado incorreto. Denominador zero deve resultar em valor nulo e ser apresentado como “Sem população elegível”.

Filtros recomendados: `competency`, `district_id`, `establishment_id`, `cnes`, `team_id`, `ine`, `practice_code` e `classification`.

## Permissões mínimas e segurança

O template [metabase-reader-template.sql](metabase-reader-template.sql) prepara `mae_metabase_reader` sem `LOGIN` e sem senha. A habilitação de `LOGIN` e a senha devem ser feitas futuramente fora do Git, por canal seguro. O papel recebe apenas `USAGE` em `core`/`analytics` e `SELECT` nas dimensões, fatos agregados e views necessários ao funcionamento de `security_invoker`.

Não conceder acesso a `auth`, `app`, `siaps`, `audit`, `study`, `storage` ou `public`; não conceder `INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`, `REFERENCES`, `TRIGGER`, `CREATE` nem `EXECUTE` em RPCs privilegiadas. Nunca usar `service_role`, chave secreta ou a senha principal do banco no Metabase.

## Passos futuros de conexão

1. Aplicar e validar as migrations em CI e no Supabase remoto com backup e revisão humana.
2. Executar o template de papel read-only como administrador do banco.
3. Habilitar `LOGIN` e definir uma senha forte fora do repositório.
4. Restringir rede/SSL conforme o plano Supabase e cadastrar a conexão PostgreSQL no Metabase.
5. Expor inicialmente apenas as views `dashboard_*`, ocultando as tabelas de suporte na interface do Metabase.
6. Criar perguntas-modelo que usem razão das somas e validar os totais contra o Dashboard MAE APS.

As views são normais, não materializadas. Dados publicados ficam disponíveis imediatamente após a transação de importação; não existe job de refresh. Materialized views só devem ser consideradas após evidência real de gargalo.
