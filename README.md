# MAE APS

**Monitoramento, Atenção e Estratégia na APS** é o software da Gestão municipal para monitorar o indicador C3 — Cuidado na Gestação e Puerpério — com dados oficiais SIAPS.

O Supabase oficial é o projeto `dashboard-v3` (`nyexakdyxtstcyycmlng`). O remoto contém dados reais e nunca deve receber reset destrutivo.

## Desenvolvimento

1. Use Node.js 22 ou superior e execute `npm ci`.
2. Configure `.env.local` a partir de `.env.example`.
3. Execute `npm run dev`.
4. Valide com `npm test`, `npm run typecheck`, `npm run lint` e `npm run build`.
5. Com Docker disponível, execute `npm run db:start`, `npm run db:reset` e `npm run test:db`, sempre sem `--linked`.

O workflow manual **MAE APS - Validacao V1** (`.github/workflows/validate-v1.yml`) reproduz esses checks no GitHub Actions, incluindo reconstrução completa do Supabase local e testes SQL/RLS, sem acessar o projeto remoto.

O navegador recebe apenas `NEXT_PUBLIC_SUPABASE_URL`, a chave publicável e a URL canônica do app. `SUPABASE_SECRET_KEY` é exclusiva do servidor e necessária para ingestão e consulta administrativa de `auth.users`.

## Módulos V1.0

- **Gestão:** Dashboard municipal reativo em formato executivo, com período inicial/final, filtros territoriais e por classificação C3, busca por CNES/INE, KPIs, série histórica, práticas A–K, comparativos por UBS/equipe, distribuição por classificação, rastreabilidade das importações e resumo consolidado; e importação XLSX SIAPS com validação, pré-visualização, SHA-256, duplicidade, publicação e histórico.
- **Administrador:** Gestão territorial com vigência histórica e auditoria; ajuste fino e auditado de nome/CNES das UBS mediante dupla confirmação; e administração de perfis.
- **Leitura:** acesso somente ao Dashboard.

Não existe módulo específico de piloto. O recorte analisado pelo Dashboard é determinado pelos dados oficiais efetivamente importados. Na implantação inicial, a base pode começar apenas com as UBS selecionadas para a primeira etapa e ser ampliada posteriormente sem mudança de código.

O Metabase pode ser usado como ferramenta analítica complementar, mas não substitui os módulos oficiais do MAE APS. O software dos profissionais é um produto separado e não faz parte deste repositório.

## Release e registro

Após CI verde e congelamento da versão, execute `npm run registro:codigo`, crie a tag da release e somente então rode `npm run registro:hash -- --tag <tag>`. Pendências administrativas permanecem em `docs/registro/PENDENCIAS_NITT.md`.

Documentos operacionais: [deploy](docs/DEPLOY.md), [importação](docs/IMPORTACAO_SIAPS.md), [permissões](docs/PERMISSOES.md) e [registro de software](docs/registro/RESUMO_TECNICO.md).

Créditos: Desenvolvimento — Lucca Araújo · Design — Kethilly Nayara · PET SAÚDE UFCG.
