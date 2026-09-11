# Contrato de Implementação — Software da Gestão V3

Este documento substitui o contrato anterior que reunia Gestão e Profissional no mesmo software.

## 1. Objetivo

Construir um software independente para a Gestão Municipal, baseado em dados oficiais do SIAPS e preparado desde o início para todas as UBS e equipes do município.

O software dos profissionais é outro projeto. Dados PEC, pacientes individuais e diário clínico não pertencem a este repositório e nunca alimentam o C3 oficial.

## 2. Fonte e série oficial

Fonte inicial: SIAPS — Relatório Qualidade — Visão por Competência.

- Município inicial: Campina Grande-PB / IBGE 250400
- Série inicial: JAN/2026 em diante
- Indicador inicial: C3 — Cuidado na Gestação e Puerpério
- XLSX como formato inicial de ingestão
- CNES identifica estabelecimento
- INE identifica equipe

A ingestão aceita toda equipe válida presente no arquivo, sem listas fixas no código.

## 3. Arquitetura de dados

- app: perfis e acesso
- core: distritos, estabelecimentos, equipes e vigências
- siaps: importações e linhas normalizadas
- analytics: fatos C3 e componentes A–K
- study: coortes analíticas
- audit: rastreabilidade

O schema professional não existe neste software.

## 4. Território

A referência territorial completa pode chegar depois da ingestão SIAPS.

Enquanto um estabelecimento não tiver distrito confirmado:
- seus dados continuam válidos;
- o painel municipal e por UBS/equipe continuam funcionando;
- o distrito é exibido como “Não informado”;
- nenhuma associação territorial é inferida por nome.

Quando a referência oficial chegar, ela será vinculada por CNES e vigência.

## 5. Piloto

O piloto contém 14 equipes, duas por distrito, classificadas externamente como boa ou ruim.

Essa informação existe somente em study.cohorts e study.cohort_members.

Regras:
- o piloto é filtro opcional;
- não altera a ingestão;
- não altera o cálculo do C3;
- não é codificado na interface;
- a classificação boa/ruim não é derivada automaticamente do C3.

## 6. C3

Para cada equipe:

pontos = 10*A + 9*(B+C+D+E+F+G+H+I+J+K)

C3 = pontos_total / denominador

Agregações municipal, distrital e por UBS:

SUM(pontos_total) / SUM(denominador)

Nunca usar média simples dos percentuais das equipes.

Classificação:
- Ótimo: > 75 e <= 100
- Bom: > 50 e <= 75
- Suficiente: > 25 e <= 50
- Regular: <= 25
- Denominador zero: Sem população elegível

## 7. Golden set JAN–JUN/2026

| Competência | Equipes | Denominador | C3 |
|---|---:|---:|---:|
| JAN/26 | 203 | 2.595 | 36,33 |
| FEV/26 | 203 | 2.540 | 36,24 |
| MAR/26 | 187 | 2.492 | 37,23 |
| ABR/26 | 153 | 2.423 | 37,51 |
| MAI/26 | 157 | 2.467 | 37,49 |
| JUN/26 | 156 | 2.443 | 36,83 |

Qualquer mudança no parser ou analytics deve preservar esses resultados.

## 8. Dashboard

A primeira interface da Gestão prioriza:
- competência/status do SIAPS;
- C3 agregado do escopo selecionado;
- classificação;
- denominador;
- quantidade de equipes e UBS;
- tendência temporal;
- componentes A–K;
- equipes/UBS com menor desempenho;
- filtros de competência, distrito, UBS, equipe e escopo;
- opção Todas as equipes ou Piloto 2026.

O dashboard não esconde registros sem distrito. Eles entram como Não informado.

## 9. Segurança

- URL + publishable key podem ficar no frontend.
- Secret/service-role nunca vai para o navegador.
- páginas da Gestão exigem usuário autenticado e perfil ativo.
- views públicas usam security_invoker.
- dados raw do SIAPS não ficam expostos ao frontend.
- escrita/importação ocorre por caminhos server-side controlados.

## 10. Proibições

Não:
- criar lógica fixa para as 14 equipes;
- usar nome como chave de identidade;
- excluir equipe apenas por não ter distrito;
- calcular C3 por média simples;
- misturar dados PEC com SIAPS;
- recriar módulo Profissional neste repositório;
- versionar chaves secretas;
- usar service-role no browser.
