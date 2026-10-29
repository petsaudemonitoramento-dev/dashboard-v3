# Metabase como inteligencia analitica do MAE APS — 29/10/2026

## Escopo oficial

**O gestor acessa somente o MAE APS**; Metabase Open Source e motor de
consultas agregadas, usado pela equipe tecnica para formular e atualizar
analises de tendencias, territorio, praticas A–K e qualidade de dados.
Nao repetir os graficos operacionais ja existentes no MAE APS.

## Estado verificado

- Supabase `dashboard-v3` (MAE APS), views `analytics.dashboard_*`
  existentes e populadas, role de consulta `mae_metabase_reader` criada
  com `NOLOGIN`, sem superuser/bypass RLS, migration versionada.
- 13 queries analiticas novas executadas com `EXPLAIN` e `SELECT` sobre
  a base agregada oficial, sem falha de SQL. Nenhum CSV ou dado pessoal
  foi exportado para GitHub.
- 4 abas em `metabase/questions.json`, script de provisionamento
  idempotente, testes offline, Postgres interno Docker e alternativa
  Caddy HTTPS gratuitos versionados.
- Guest embedding sem SSO pago codificado no MAE APS, com JWT HS256,
  autenticacao por perfis `gestao/leitura` e feature flag desativada.
- **Nao concluido:** hospedagem na maquina 24h, usuario admin, conexao
  PostgreSQL pelo leitor, autorizacao do embed, DNS/HTTPS, validacao
  dos cards no Metabase real, backup restaurado, deploy da funcionalidade.
  Nao declarar producao antes desses passos.

## Regra de C3

`SUM(points_total)/NULLIF(SUM(denominator),0)` para agregacoes.
As views existentes fornecem points_total/denominator agregados por
competencia, distrito, UBS ou pratica; nao se deve calcular media simples
de `c3`. Diferencas entre competencias sao relatadas em **pontos
percentuais**, nao como variacao percentual relativa. Denominador zero
nao e desempenho zero.

## Acesso e privacidade

- Usar somente `analytics.dashboard_*` e credencial dedicada de leitura,
  jamais `postgres`, service_role, chave master ou login de gestor.
- `security_invoker=true` nas views; RLS explicita nas tabelas agregadas
  de apoio e dimensoes core. Nunca abrir tabelas de pacientes, `auth`,
  `app`, `siaps`, `audit` nem `storage` ao leitor.
- Guest embedding so com painel assinado e publicado na interface
  administrativa, sem public sharing. Usuarios autorizados podem
  exportar dados agregados na versao gratuita: **revisar agregacao**.
- Sem SSO pago nem white-label completo; o banner Powered by Metabase
  permanece.

## Onde trabalhar

- [Pacote e checklist definitivo de instalacao](../metabase/README.md)
- [Abas, consultas e metodologia](../metabase/DESIGN.md)
- [Manifesto das 13 perguntas (fonte de verdade)](../metabase/questions.json)
- [Integracao gratuita dentro do MAE APS](../metabase/EMBED_MAE_APS.md)
- [Testes de privilegio da role](../supabase/tests/005_metabase_reader.test.sql)

Este documento nao e prova de Metabase rodando; e o registro do que foi
preparado antes da maquina cedida pela professora.
