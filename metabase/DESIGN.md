# MAE APS — desenho do painel Metabase

Status: layout definido e versionado, ainda sem instância Metabase real. O protótipo HTML entregue à gestão utiliza dados fictícios, não é a interface exata do produto.

## Identidade visual

Referência MAE APS: azul institucional #0A3570, azul principal #0C7CE9, turquesa #16B8B1, fundo #F5F8FB, texto #102F57. O Metabase gratuito não oferece personalização completa da marca, mas permite dispor perguntas, gráficos, cartões numéricos, títulos e abas. Não prometer fontes, logo ou navegação personalizada dentro do OSS.

## Estrutura do dashboard (grade nativa de 24 colunas)

**Panorama municipal:** quatro números (C3 atual; UBS monitoradas; equipes no mês; equipes sem distrito) na primeira linha, evolução temporal municipal e classificação das equipes na segunda linha. A medida de equipes sem distrito é uma observação de qualidade cadastral, não uma classificação assistencial.

**Distritos e UBS:** evolução distrital à esquerda, comparação de UBS à direita e tabela de equipes para acompanhamento em largura total abaixo.

**Práticas A–K:** gráfico de barras com razão de cumprimentos sobre denominadores, por prática, mantendo as letras do modelo SIAPS.

A definição exata de posições, tamanhos e queries fica em [questions.json](questions.json). O script [provision.py](scripts/provision.py) cria os gráficos e o layout, respeitando conteúdo já existente e sem copiar dados reais para o GitHub.

## Filtros desejados

Competência (mês), distrito, UBS (CNES) e, opcionalmente, equipe (INE). As perguntas inicialmente mostram a última competência nos comparativos; o vínculo dos filtros globais às perguntas SQL será realizado e testado na interface da instância. O protótipo HTML representa a experiência desejada, mas não valida a filtragem nativa do Metabase.

## Regras

- C3 agregado = SUM(points_total)/NULLIF(SUM(denominator),0), nunca AVG(c3).
- Mostrar 2 casas decimais, em pontos percentuais (0–100).
- Tratar denominador nulo ou zero como “Sem população elegível”.
- Não somar competências mensais como se fossem pessoas distintas.
- Não criar limiares clínicos nem alterar as classificações oficiais.
- Não disponibilizar dados individuais nem compartilhamento público.
- Garantir leitura no iPad, contraste, largura suficiente de tabelas e filtros claros.

## Critérios para concluir após acesso à máquina

1. Metabase saudável e inicializado por administrador autorizado no navegador.
2. Conexão TLS ao Supabase MAE APS com role restrita, sem acesso a dados individuais.
3. Três abas e dez perguntas sem duplicatas.
4. Conferência de C3 total, distrito e UBS com o painel MAE APS.
5. Filtros reais funcionando, incluindo ausência de dados e competência anterior.
6. Permissões dos grupos, backup, acesso remoto e exibição iPad validados.

Referências: https://www.metabase.com/docs/latest/dashboards/introduction ; https://www.metabase.com/docs/latest/dashboards/filters ; https://www.metabase.com/docs/latest/configuring-metabase/appearance
