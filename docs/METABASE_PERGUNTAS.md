# MAE APS — catalogo analitico do Metabase

**Fonte de verdade para SQL e layout:**
[`metabase/questions.json`](../metabase/questions.json).
O catalogo antigo de seis perguntas foi substituido: os indicadores
basicos ja existem dentro do MAE APS. A nova area **Inteligencia em Saude**
deve oferecer valor adicional, sem duplicacao.

| Aba | IDs das perguntas | Pergunta analitica |
| --- | --- | --- |
| Tendencias | `variacao_municipal`, `distritos_queda_continua`, `ubs_queda_mensal`, `trajetoria_territorial`, `distritos_variacao` | Como os territorios mudaram de um mes para o outro? |
| Investigacao territorial | `ubs_variacao`, `praticas_por_distrito` | Onde houve maior reducao e quais praticas apresentam coberturas menores? |
| Praticas A–K | `praticas_variacao`, `praticas_trajetoria` | Que praticas variaram mais e como suas coberturas evoluiram? |
| Qualidade dos dados | `defasagem_competencia`, `sem_distrito_evolucao`, `sem_elegiveis_evolucao`, `variacao_denominador` | Quais limites do dado podem afetar a interpretacao? |

## Qualidade metodologica

- Somente 7 views agregadas `analytics.dashboard_*` do projeto
  `dashboard-v3` do MAE APS e auxiliares; sem dados pessoais.
- Escala de C3 0–100, agregacao por razao de somas.
- `variacao_pp`: diferenca de pontuacoes entre competencias em
  **pontos percentuais**.
- Comparacoes usam competencias de meses **consecutivos**;
  sem dados anteriores nao contam como zero.
- Tres meses de quedas consecutivas = duas variacoes negativas
  em meses subsequentes; nao implica inferencia causal.
- Praticas usam `100*SUM(fulfilled)/NULLIF(SUM(denominator),0)`.
- Dados sem distrito ou sem elegiveis nao representam
  automaticamente falha de profissional ou atendimento.
- `defasagem_competencia` e referencia temporal, nao regra de
  atraso oficial do SIAPS.

## Testes executados antes da maquina

As 13 queries foram planejadas por `EXPLAIN` e executadas como
`SELECT` limitado no Supabase oficial em 29/10/2026. Todas
responderam com sucesso. Isso nao certifica a renderizacao real
dentro de um Metabase ainda inexistente.

## O que sera configurado no Metabase

- Publicar as quatro abas e seus cards com
  `python3 scripts/provision.py --apply`;
- Conferir formato numerico, eixos/legendas e legibilidade no iPad;
- Se desejar filtros adicionais, criar variaveis e mapear aos graficos
  seguindo a [documentacao de filtros](https://www.metabase.com/docs/latest/dashboards/filters);
  nao assumir que filtros globais ja estao funcionando.
- Publicar Guest Embed JWT, nunca link publico;
- Conferir os indicadores com MAE APS no mesmo recorte antes de disponibilizar
  para a gestao.

O programa de pesquisa pode adicionar perguntas novas no Metabase pela
equipe tecnica, sem precisar alterar codigo do MAE APS a cada nova consulta.
