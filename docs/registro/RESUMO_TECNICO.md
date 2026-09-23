# Resumo técnico — MAE APS

## Identificação e objetivo

MAE APS significa Monitoramento, Atenção e Estratégia na APS. A V1.0 apoia a Gestão municipal no monitoramento do indicador C3 — Cuidado na Gestação e Puerpério — a partir de planilhas oficiais SIAPS, sem armazenar prontuário ou dados clínicos individuais. A titularidade prevista do registro é da Universidade Federal de Campina Grande — UFCG.

## Tecnologias e arquitetura

Aplicação web TypeScript com Next.js 16/React 19, Supabase Auth SSR, PostgreSQL/Supabase, RLS, Tailwind CSS e Apache ECharts. Os schemas são `app`, `core`, `siaps`, `analytics`, `study` e `audit`. CNES e INE são chaves de negócio; vínculos territoriais têm vigência histórica.

## Módulos e funcionalidades

- autenticação e autorização por perfis `admin`, `gestao` e `leitura`;
- dashboard C3 com razão das somas, filtros, A–K, série histórica e drill-down;
- parser, validação, SHA-256, publicação e histórico de importações SIAPS;
- manutenção do território com histórico e auditoria;
- análise da coorte externa `piloto_2026_c3` sem limitar a base municipal;
- administração auditada de usuários/perfis.

Fonte de dados: relatórios oficiais SIAPS fornecidos à Gestão municipal. Dados agregados por equipe e competência.

## Campos pendentes

Pendente de preenchimento/validação pelo NITT/equipe: classificação INPI do campo de aplicação; classificação do tipo de programa; data oficial da primeira utilização; lista final de criadores; documentação administrativa de cessão/titularidade.
