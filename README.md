# Cuidado na Gestação na APS — V3

Nova geração da plataforma institucional de acompanhamento e análise do cuidado na gestação na Atenção Primária à Saúde.

## Status

Arquitetura V3.0 congelada. Implementação iniciada em ambiente isolado, sem alterar a V2 em produção.

## Escopo inicial

- Município inicial: Campina Grande-PB.
- Série oficial de gestão: competências SIAPS a partir de janeiro de 2026.
- Indicador inicial: C3 — Cuidado na Gestação e Puerpério.
- Perfis: `administrador`, `gestao_municipal`, `profissional`.
- Gestão: dados oficiais do SIAPS, exclusivamente por importação de Relatório Qualidade — Visão por Competência.
- Profissional: diário clínico privado e importação PEC, sem alimentar indicadores oficiais de gestão.
- Território: Município → Distrito → UBS → Equipe.
- UBS entram no painel; policlínicas e âncoras são reconhecidas e excluídas do escopo analítico.

## Stack alvo

- Next.js 16.x
- React 19.x
- TypeScript 5.x
- Supabase Auth / PostgreSQL / Storage / RLS
- `@supabase/ssr` e `@supabase/supabase-js`
- PostgreSQL acessível por camada server-side quando necessário
- SheetJS/XLSX para ingestão SIAPS
- Vitest para testes automatizados
- Vercel para deploy do frontend
- Metabase institucional UFCG futuramente, consumindo apenas a camada analítica read-only

## Supabase V3

- Project ref: `nyexakdyxtstcyycmlng`
- Region: `sa-east-1`
- URL pública do projeto deve ser fornecida por variável de ambiente.
- Nunca versionar chaves secretas/service-role.

## Contrato técnico

Ver [`docs/IMPLEMENTATION_CONTRACT.md`](docs/IMPLEMENTATION_CONTRACT.md).

## Regra de ouro

Dados do módulo Profissional e dados oficiais da Gestão são domínios separados. Dados clínicos privados de profissionais **nunca** alimentam os indicadores oficiais de gestão.
