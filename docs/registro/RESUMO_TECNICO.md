# Resumo técnico — MAE APS

## Identificação e objetivo

MAE APS significa Monitoramento, Atenção e Estratégia na APS. A V1.0 apoia a Gestão municipal no monitoramento do indicador C3 — Cuidado na Gestação e Puerpério — a partir de planilhas oficiais SIAPS, sem armazenar prontuário ou dados clínicos individuais. A titularidade prevista do registro é da Universidade Federal de Campina Grande — UFCG.

## Tecnologias e arquitetura

Aplicação web TypeScript com Next.js 16/React 19, Supabase Auth SSR, PostgreSQL/Supabase, RLS, Tailwind CSS e Apache ECharts. Os schemas são `app`, `core`, `siaps`, `analytics`, `study` e `audit`. CNES e INE são chaves de negócio; vínculos territoriais têm vigência histórica.

## Módulos e funcionalidades

- autenticação e autorização por perfis `admin`, `gestao` e `leitura`;
- dashboard C3 com razão das somas, filtros, A–K, série histórica e drill-down;
- filtros hierárquicos Distrito → UBS → Equipe, normalizados no servidor;
- parser e importação exclusivamente XLSX, com limites de 10 MiB, 10.000 linhas
  e payload JSON de 4 MiB, SHA-256, validação cliente/servidor, publicação
  atômica e histórico;
- manutenção do território com histórico e auditoria;
- ajuste cadastral restrito de nome/CNES da UBS, com dupla confirmação e trilha de auditoria;
- administração paginada e auditada de usuários/perfis, com proteção do último
  administrador ativo;
- observabilidade sanitizada, headers HTTP incrementais, testes de
  acessibilidade e gates de CI/CodeQL;
- camada analítica estável e read-only preparada para integração futura com Metabase.

A aplicação não possui módulo específico de piloto: o recorte exibido no Dashboard corresponde aos dados oficiais efetivamente importados, permitindo expansão progressiva da base sem alteração do software.
Também não possui coordenador distrital nem segregação territorial por usuário;
Gestão e Leitura mantêm visão municipal conforme as respectivas permissões.

Fonte de dados: relatórios oficiais SIAPS fornecidos à Gestão municipal. Dados agregados por equipe e competência.

## Campos pendentes

Pendente de preenchimento/validação pelo NITT/equipe: classificação INPI do campo de aplicação; classificação do tipo de programa; data oficial da primeira utilização; lista final de criadores; documentação administrativa de cessão/titularidade.
