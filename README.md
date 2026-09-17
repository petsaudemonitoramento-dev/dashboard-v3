# Cuidado na Gestação na APS — V3

Fundação da plataforma institucional de cuidado na gestação na APS.
A especificação normativa está em docs/IMPLEMENTATION_CONTRACT.md.

## Escopo da Fase 1

Next.js 16, Supabase Auth, perfis V3, aprovação administrativa, guards
server-side, schemas isolados, RLS, Storage privado, auditoria e testes.
Dashboard analítico, Metabase e parsers completos estão fora desta fase.

## Desenvolvimento local

1. Execute npm install.
2. Copie .env.example para .env.local e informe apenas a URL e a chave publicável V3.
3. Execute npm run db:start, npm run db:reset e npm run test:db.
4. Execute npm run dev.
5. Valide com npm run build, npm run lint e npm test.

Nunca use service_role, senha do banco ou credenciais da V2.

## Supabase hospedado

Habilite e-mail/senha, confirmação de e-mail e Google OAuth. Inclua a URL
pública da aplicação e /auth/callback na allow-list. A Data API expõe apenas
public, graphql_public, core e security; os schemas professional, siaps,
analytics_gestao e audit permanecem fora da API.

As migrations criam os buckets privados siaps-source, territorio-source e
professional-source. Arquivos profissionais usam auth.uid() como primeiro
segmento do caminho; os outros buckets não aceitam acesso direto de usuários.

## Primeiro administrador

O cadastro público sempre nasce como profissional pendente. Depois de criar,
confirmar e completar o primeiro cadastro, execute no SQL Editor:

    select security.bootstrap_first_administrator('email@instituicao.br');

A função só funciona antes de existir um Administrador ativo e aprovado, não
pode ser chamada por anon/authenticated e registra o bootstrap na auditoria.
As aprovações seguintes são feitas em /sistema/administracao.

## Segurança

O servidor valida auth.getUser(). Um perfil ativo também exige cadastro
completo, aprovação, atividade e ausência de bloqueio/exclusão. Dados clínicos
usam owner_user_id = auth.uid(); Gestão e Administrador não recebem leitura
clínica implícita. RPCs administrativas revalidam o papel no banco e auditam
mudanças de aprovação, papel e bloqueio.
