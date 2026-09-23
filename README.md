# MAE APS

**Monitoramento, Atenção e Estratégia na APS** é o software da Gestão municipal para monitorar o indicador C3 — Cuidado na Gestação e Puerpério — com dados oficiais SIAPS.

O Supabase oficial é o projeto `dashboard-v3` (`nyexakdyxtstcyycmlng`). O remoto contém dados reais e nunca deve receber reset destrutivo. A Data API remota já está configurada para os schemas atuais: `app`, `core`, `siaps`, `analytics`, `study` e `audit` conforme a necessidade de exposição.

## Desenvolvimento

1. Use Node.js 22 ou superior e execute `npm ci`.
2. Configure `.env.local` a partir de `.env.example`.
3. Execute `npm run dev`.
4. Valide com `npm test`, `npm run typecheck`, `npm run lint` e `npm run build`.
5. Com Docker disponível, execute `npm run db:start`, `npm run db:reset` e `npm run test:db`, sempre sem `--linked`.

O workflow manual **MAE APS - Validacao V1** (`.github/workflows/validate-v1.yml`) reproduz esses checks no GitHub Actions, incluindo reconstrução completa do Supabase local e testes SQL/RLS, sem acessar o projeto remoto.

O navegador recebe apenas `NEXT_PUBLIC_SUPABASE_URL`, a chave publicável e a URL canônica do app. `SUPABASE_SECRET_KEY` é exclusiva do servidor e necessária para ingestão e consulta administrativa de `auth.users`.

## Módulos V1.0

- Dashboard municipal reativo, com filtros, agregação por razão das somas, A–K e drill-down Município → Distrito → UBS → Equipe.
- Importação XLSX SIAPS com validação, pré-visualização, SHA-256, duplicidade, publicação e histórico.
- Gestão territorial com vigência histórica e auditoria.
- Coorte `piloto_2026_c3` como filtro analítico, nunca como limite de ingestão.
- Administração de perfis `admin`, `gestao` e `leitura`.

O Metabase pode ser usado como ferramenta analítica complementar, mas não substitui os módulos oficiais do MAE APS. O software dos profissionais é um produto separado e não faz parte deste repositório.

## Release e registro

Após CI verde e congelamento da versão, execute `npm run registro:codigo`, crie a tag da release e somente então rode `npm run registro:hash -- --tag <tag>`. Pendências administrativas permanecem em `docs/registro/PENDENCIAS_NITT.md`.

Documentos operacionais: [deploy](docs/DEPLOY.md), [importação](docs/IMPORTACAO_SIAPS.md), [permissões](docs/PERMISSOES.md) e [registro de software](docs/registro/RESUMO_TECNICO.md).

Créditos: Desenvolvimento — Lucca Nunes dos Santos Pereira de Araújo · Design — Kethilly Nayara Felix de Souza · PET SAÚDE UFCG.
