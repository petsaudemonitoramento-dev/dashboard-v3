# MAE APS — perguntas iniciais para Metabase

Este catálogo usa **exclusivamente** o banco `dashboard-v3`, schema `analytics`. Foi preparado para criação das perguntas na interface de uma instância Metabase autenticada. **Ainda não são dashboards publicados**: a criação depende de uma instância Metabase acessível.

> A coluna `c3` da base está em pontos percentuais (0 a 100). Toda agregação entre equipes/UBS/distritos deve dividir a soma de pontos pela soma dos denominadores; não usar `AVG(c3)`. Denominador zero deve aparecer como "Sem população elegível".

## 1. Evolução municipal do C3 (gráfico de linha)

```sql
SELECT competency AS competencia,
       ROUND(points_total / NULLIF(denominator, 0), 2) AS c3,
       denominator AS populacao_elegivel,
       points_total AS pontos
FROM analytics.dashboard_competencies
ORDER BY competency;
```

Eixos: `competencia` (mês) e `c3` (0–100). Exibir `populacao_elegivel` no detalhamento.

## 2. C3 por distrito ao longo do período (linhas por distrito)

```sql
SELECT competency AS competencia,
       COALESCE(district_name, 'Sem distrito') AS distrito,
       ROUND(SUM(points_total) / NULLIF(SUM(denominator), 0), 2) AS c3,
       SUM(denominator) AS populacao_elegivel
FROM analytics.dashboard_c3_district_monthly
WHERE 1=1
  [[AND competency >= {{inicio}}]]
  [[AND competency <= {{fim}}]]
GROUP BY competency, COALESCE(district_name, 'Sem distrito')
ORDER BY competencia, distrito;
```

Variáveis opcionais `inicio` e `fim` do tipo Data. Não somar competências como se fossem gestantes únicas; são recortes mensais.

## 3. Comparativo por UBS (barras horizontais)

```sql
SELECT cnes, establishment_name AS ubs,
       COALESCE(district_name,'Sem distrito') AS distrito,
       ROUND(SUM(points_total) / NULLIF(SUM(denominator),0), 2) AS c3,
       SUM(denominator) AS populacao_elegivel,
       SUM(teams) AS equipes
FROM analytics.dashboard_c3_establishment_monthly
WHERE competency = {{competencia}}
  [[AND district_id = {{distrito_id}}]]
GROUP BY cnes, establishment_name, COALESCE(district_name,'Sem distrito')
ORDER BY c3 DESC NULLS LAST, ubs;
```

`competencia`: Data obrigatória, sempre primeiro dia do mês; `distrito_id`: Número opcional. Exibir em branco ou "Sem população elegível" quando `c3` for nulo.

## 4. Equipes que exigem atenção (tabela filtrável)

```sql
SELECT cnes, establishment_name AS ubs, ine,
       team_name AS equipe,
       COALESCE(district_name,'Sem distrito') AS distrito,
       classification AS classificacao,
       ROUND(points_total / NULLIF(denominator,0),2) AS c3,
       denominator AS populacao_elegivel
FROM analytics.dashboard_c3_team_monthly
WHERE competency = {{competencia}}
  [[AND district_id = {{distrito_id}}]]
ORDER BY c3 ASC NULLS LAST, ubs, equipe;
```

Usar as classificações oficiais já calculadas pela view. Não criar limites próprios sem referência à regra de C3.

## 5. Distribuição mensal das classificações (barras empilhadas)

```sql
SELECT competency AS competencia,
       COALESCE(classification,'Sem classificação') AS classificacao,
       COUNT(*) AS quantidade_equipes
FROM analytics.dashboard_c3_team_monthly
WHERE 1=1
  [[AND competency >= {{inicio}}]]
  [[AND competency <= {{fim}}]]
GROUP BY competency, COALESCE(classification,'Sem classificação')
ORDER BY competencia, classificacao;
```

## 6. Práticas A–K por competência (barras / tabela)

```sql
SELECT practice_code AS pratica,
       SUM(fulfilled) AS registros_atendidos,
       SUM(denominator) AS denominador_da_pratica,
       ROUND(100.0 * SUM(fulfilled) / NULLIF(SUM(denominator),0), 2) AS percentual
FROM analytics.dashboard_c3_practice_summary
WHERE competency = {{competencia}}
  [[AND district_id = {{distrito_id}}]]
  [[AND cnes = {{cnes}}]]
GROUP BY practice_code
ORDER BY practice_code;
```

Variáveis `competencia` (Data), `distrito_id` (Número), `cnes` (Texto). Interpretar o percentual como a razão dos campos na view, não como percentual individual de gestantes.

## Validação antes de publicar

1. Comparar C3 do mês mais recente com a tela inicial do MAE APS, e repetir por um distrito e uma UBS.
2. Testar período sem dados, denominador zero, equipe sem distrito, competência mais antiga e filtros combinados.
3. Confirmar que o usuário `mae_metabase_reader` **não pode** consultar `auth`, `app`, `siaps`, `audit`, `study`, `storage` nem aliases do schema `public`.
4. Desativar publicação pública dos painéis. Compartilhar somente com usuários de gestão autorizados; considerar guest embedding apenas com JWT assinado no servidor e escopo de dados revisto.
5. Configurar timezone America/Fortaleza na instância e manter competência como `DATE` (1º dia do mês).
6. Nunca colar senhas, URL com senha ou chaves em issues, PRs, logs ou no chat.

**Ordem para montar o dashboard:** Evolução municipal → Comparativo por UBS → Classificações → Equipes que exigem atenção → Práticas A–K → Distribuição territorial.

