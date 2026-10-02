# MAE APS

**Monitoramento, Atenção e Estratégia na APS** é o software da Gestão municipal para monitorar o indicador C3 — Cuidado na Gestação e Puerpério — com dados oficiais SIAPS.

O Supabase oficial é o projeto `dashboard-v3` (`nyexakdyxtstcyycmlng`). O remoto contém dados reais e nunca deve receber reset destrutivo.

## Desenvolvimento

1. Use Node.js 22 ou superior e execute `npm ci`.
2. Configure `.env.local` a partir de `.env.example`.
3. Execute `npm run dev`.
4. Valide com `npm test`, `npm run typecheck`, `npm run lint` e `npm run build`.
5. Execute reconstrução do Supabase e testes SQL/RLS pelo GitHub Actions quando a máquina local estiver com armazenamento restrito.

O workflow **MAE APS - Validacao V1** (`.github/workflows/validate-v1.yml`) roda automaticamente em pull requests e pushes para `main`, além de aceitar execução manual. Ele reproduz esses checks no GitHub Actions, incluindo reconstrução completa do Supabase local e testes SQL/RLS, sem acessar o projeto remoto.

## CI e produção

O fluxo de entrega é: branch de feature/integração → pull request para `main` → check obrigatório **Validar aplicacao, migrations e RLS** → merge → produção. A proteção da branch no GitHub deve impedir o merge enquanto esse check não estiver verde.

Na Vercel, o mesmo check deve ser configurado como Deployment Check obrigatório do ambiente Production. O build da Vercel pode ocorrer em paralelo ao GitHub Actions, mas o deployment não deve receber o domínio de produção enquanto o check estiver pendente ou vermelho. Essa integração usa o vínculo GitHub já existente e não exige novas credenciais no repositório. Consulte [docs/DEPLOY.md](docs/DEPLOY.md) para a configuração manual.

O navegador recebe apenas `NEXT_PUBLIC_SUPABASE_URL`, a chave publicável e a URL canônica do app. `SUPABASE_SECRET_KEY` é exclusiva do servidor e necessária para ingestão e consulta administrativa de `auth.users`.

## Módulos V1.0

- **Gestão:** Dashboard municipal reativo em formato executivo, com período inicial/final, filtros territoriais e por classificação C3, busca por CNES/INE, KPIs, série histórica, práticas A–K, comparativos por UBS/equipe, distribuição por classificação, rastreabilidade das importações e resumo consolidado; e importação XLSX SIAPS com validação, pré-visualização, SHA-256, duplicidade, publicação e histórico.
- **Administrador:** Gestão territorial com vigência histórica e auditoria; ajuste fino e auditado de nome/CNES das UBS mediante dupla confirmação; e administração de perfis.
- **Leitura:** acesso somente ao Dashboard.

Não existe módulo específico de piloto. O recorte analisado pelo Dashboard é determinado pelos dados oficiais efetivamente importados. Na implantação inicial, a base pode começar apenas com as UBS selecionadas para a primeira etapa e ser ampliada posteriormente sem mudança de código.

O Metabase está arquitetonicamente preparado como camada analítica complementar e read-only sobre views estáveis do schema `analytics`; consulte `docs/METABASE.md`. O software dos profissionais é um produto separado e não faz parte deste repositório.

## Release e registro

O fluxo de congelamento é: CI verde → Preview aprovado → smoke test aprovado →
merge aprovado → commit final de `main` validado → freeze → geração e revisão do
pacote com `npm run registro:codigo` → tag anotada `v1.0.0` → manifesto final
com `npm run registro:hash -- --tag v1.0.0` → material do registro. O pacote e
o manifesto são artefatos externos e ignorados pelo Git; não crie a tag antes
da aprovação formal do freeze. Consulte `docs/registro/ARQUIVOS_AUTORAIS.md` e
mantenha as pendências administrativas em `docs/registro/PENDENCIAS_NITT.md`.

Documentos operacionais: [Release Candidate](docs/RELEASE_CANDIDATE_V1.md), [smoke test](docs/SMOKE_TEST_V1.md), [deploy](docs/DEPLOY.md), [autenticação](docs/AUTENTICACAO.md), [importação](docs/IMPORTACAO_SIAPS.md), [acessibilidade](docs/ACESSIBILIDADE.md), [auditoria](docs/AUDITORIA.md), [segurança HTTP](docs/SEGURANCA_HTTP.md), [teste de carga](docs/TESTE_DE_CARGA.md), [permissões](docs/PERMISSOES.md), [Metabase](docs/METABASE.md) e [registro de software](docs/registro/RESUMO_TECNICO.md).

Domínio oficial: https://maeaps.vercel.app

Créditos: Desenvolvimento — Lucca Araújo · Design — Kethilly Nayara · PET SAÚDE UFCG · Universidade Federal de Campina Grande.
