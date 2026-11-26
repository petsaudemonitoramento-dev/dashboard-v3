# MAE APS · Guia visual da Inteligência em Saúde

## Escopo

**Metabase OSS gratuito integra o MAE APS sem substituir seu painel cotidiano.**
Gestores acessam apenas o MAE APS; administração técnica opera o Metabase.
Os estudos abaixo usam exclusivamente views `analytics.dashboard_*`.
A identidade visual externa fica no MAE APS; o Metabase OSS apresenta
o próprio banner e limita o white-label a temas básicos.

## Quatro abas e 14 perguntas (manifesto fonte: `questions.json`)

| Aba | Conteúdo novo, sem duplicar o MAE APS |
| --- | --- |
| **Tendências** | Variação municipal C3 entre competências, quantidade de distritos com duas quedas consecutivas, UBS com queda no mês, trajetória de distritos e tabela de mudanças territoriais |
| **Investigação territorial** | UBS com maiores variações negativas e matriz distrito × prática A–K na última competência |
| **Práticas A–K** | Variação por prática em pontos percentuais e tendências comparadas ao longo de seis competências |
| **Qualidade dos dados** | Meses desde a competência mais recente; equipes sem distrito; equipes sem população elegível; variação de denominadores por distrito |

Grade do Metabase: 24 colunas, sem sobreposição; as posições e dimensões
são determinadas por `questions.json`. A primeira aba tem 3 indicadores
compactos, 1 gráfico e 2 tabelas; a qualidade possui 1 KPI e 3 gráficos.

## Regras científicas e interpretação

- C3 agregado é `SUM(points_total) / NULLIF(SUM(denominator),0)`, nunca
  média simples dos C3 de equipes.
- O C3 já está em escala de 0 a 100; `variacao_pp` significa diferença
  entre duas porcentagens em **pontos percentuais**, não em % relativo.
- `distritos_queda_continua` só considera três competências
  **consecutivas no calendário**, com denominadores válidos e distrito
  identificado. Ausência de competência não é interpretada como queda.
- Comparativos de UBS exigem a mesma UBS (establishment_id) presente
  nas duas competências; UBS sem observação anterior é omitida da
  comparação, não contabilizada como zero.
- As práticas A–K usam `SUM(fulfilled)/NULLIF(SUM(denominator),0)*100`.
  A cobertura de uma prática não prova que ela causou a variação no C3.
- `sem_distrito_evolucao` acompanha a atribuição territorial dos registros;
  a ausência de distrito merece revisão cadastral, sem culpa individual.
- `sem_elegiveis_evolucao` relata `denominator=0`. Nunca classificar
  automaticamente como atendimento inadequado.
- `defasagem_competencia` compara apenas o mês civil mais recente
  disponível com o mês atual do servidor. Não cria regra implícita
  sobre atrasos legítimos de publicação do SIAPS.
- Todos os gráficos mostram dados **agregados de equipes/territórios**;
  jamais incluir CPF, nome de gestante, detalhes de atendimento individual
  ou tabelas dos schemas `app`, `auth`, `audit`, `siaps`.

## Padrão visual

- Referência MAE APS: azul institucional `#0A3570`, azul `#0C7CE9`,
  turquesa `#16B8B1`, fundo `#F5F8FB`.
- Títulos curtos e explicações em português claro; não usar ranking
  como julgamento de profissionais e serviços.
- `null` e denominador zero devem aparecer como **Sem população elegível**
  ou **Dados insuficientes**, nunca como zero de desempenho.
- Mostrar mês/ano e dimensão territorial; usar precisão de duas
  casas em C3 e `variacao_pp`.
- Acesso por toque no Safari/iPad; rolagem de tabelas e fontes legíveis.
- Filtros por competência, distrito ou UBS são opcionais e só devem
  ser publicados depois de parametrizados e comparados com o MAE APS.
  O manifesto atual utiliza a última competência ou uma janela explícita
  de seis meses; **não declarar filtros como finalizados sem a VM**.

## Estado comprovado

As 14 queries foram submetidas a `EXPLAIN` e executadas como SELECT
limitado na base real `dashboard-v3` em 29/10/2026.
O script de provisionamento valida as dimensões e a organização sem
Metabase real; UI final, gráficos renderizados, filtros e segurança
de guest embedding ainda exigem testes no servidor 24h.

A arquitetura de implantação e critérios de segurança estão em
[`README.md`](README.md) e [`EMBED_MAE_APS.md`](EMBED_MAE_APS.md).
