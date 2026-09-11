# Cuidado na Gestação na APS — Gestão

Software de gestão municipal para análise do cuidado na gestação e puerpério na Atenção Primária à Saúde.

## Direção atual

Este repositório corresponde somente ao software da Gestão. O antigo módulo dos profissionais foi separado em outro software e não faz parte deste banco, deste frontend nem dos cálculos oficiais.

## Fonte oficial

- SIAPS — Relatório Qualidade — Visão por Competência
- Série inicial: JAN/2026 em diante
- Indicador inicial: C3 — Cuidado na Gestação e Puerpério
- Município inicial: Campina Grande-PB
- Identidade de estabelecimento: CNES
- Identidade de equipe: INE

## Escopo

O sistema é construído desde o início para receber todas as equipes presentes nas competências importadas.

O recorte de 14 equipes do piloto é apenas uma coorte analítica opcional para as primeiras análises. Ele não limita ingestão, banco, filtros ou interface.

## Supabase

Projeto: dashboard-v3
Ref: nyexakdyxtstcyycmlng

Schemas principais:
- app
- core
- siaps
- analytics
- study
- audit

## Situação territorial

A relação Distrito → UBS ainda está parcial. As unidades sem distrito cadastrado permanecem válidas no sistema e aparecem como “Não informado” até que a referência territorial completa seja recebida.

## Stack

- Next.js 16.3.4
- React 19.3.0
- TypeScript
- Supabase Auth / PostgreSQL / RLS
- @supabase/ssr
- Vercel

A reconstrução do novo software da Gestão começa na branch gestao-rebuild.
