# Integração MAE APS ⇄ Metabase OSS — 100% sem licença paga

## Decisão de produto (29/10/2026)

- A pessoa gestora ou com perfil `leitura` **acessa apenas o MAE APS**, com a autenticação Supabase já existente.
- O Metabase é um serviço analítico atrás da página `/sistema/gestao/inteligencia`. A UI do Metabase NÃO é utilizada como segundo portal pelos gestores.
- Não contratar Metabase Starter, Pro, Enterprise, SSO, SDK React autenticado, full-app embedding ou white-label.
- A única pessoa que precisa acessar a interface administrativa Metabase é a pessoa **administradora técnica** que configura dashboards, banco, perguntas, filtros, backups e acessos.

## Modelo gratuito selecionado

**Metabase OSS self-hosted + Guest Embedding (web component) + JWT HS256 de curta duração gerado no servidor Next.js.**

A instalação Metabase + Postgres interno está em [`metabase/compose.yaml`](compose.yaml).
A aplicação MAE APS continua na Vercel e usa o PostgreSQL Supabase `dashboard-v3`
com role `mae_metabase_reader` de leitura restrita. O Metabase NÃO precisa conhecer
os usuários nem senhas do Supabase Auth.

```
Gestão/Leitura (navegador): https://maeaps.vercel.app
           | sessão Supabase Auth (já existente)
           v
MAE APS /sistema/gestao/inteligencia
           | POST /api/metabase/guest-token [role + sessão + ID fixo]
           |  -- JWT HS256, duração 5 min, segredo apenas no servidor --
           v
Guest embed Metabase (script e dashboards HTTPS)
           | Postgres TLS, SELECT apenas views agregadas (BI reader)
           v
Supabase analytics.dashboard_* / C3
```

**Segurança importante:** o navegador necessita abrir o host HTTPS do Metabase
para carregar `/app/embed.js` e os gráficos. O endereço pode ser acessível
publicamente, MAS todo painel Guest exige token JWT válido e o PostgreSQL
interno nunca deve ser publicado. Manter administração, firewall, SSH, logs,
atualizações, rate limiting e TLS sob controle da pessoa responsável pelo servidor.
Sem HTTPS alcançável por navegadores, o embed direto não funciona.
O túnel SSH exclusivo do administrador não basta para acesso de todos os gestores.

## Implementado na branch, desligado por padrão

1. [`src/lib/metabase/guest-embed.ts`](../src/lib/metabase/guest-embed.ts)
   verifica URL HTTPS, dashboard ID allowlist, segredo e feature flag, gerando JWT HS256
   por 5 minutos sem biblioteca externa.
2. [`/api/metabase/guest-token`](../src/app/api/metabase/guest-token/route.ts)
   autentica no servidor por `requireDashboardAccess()`, recusa origens externas,
   bloqueia IDs de recursos arbitrários, envia `Cache-Control: private, no-store` e
   nunca expõe `METABASE_GUEST_SECRET_KEY`.
3. [`/sistema/gestao/inteligencia`](../src/app/%28sistema%29/sistema/gestao/inteligencia/page.tsx)
   mostra a experiência MAE APS; o componente Metabase só carrega depois de configurado.
4. O item **Análises avançadas** no menu da Gestão/Leitura só aparece
   com configuração válida; Admin e profissionais UBS não recebem essa entrada.
5. [`tests/metabase/guest-embed.test.ts`](../tests/metabase/guest-embed.test.ts)
   valida a feature flag, a assinatura e a recusa de configurações inseguras.

Nenhuma variável da integração está ativa no projeto Vercel de produção.
Não foi feito merge nem publicação do frontend nesta fase.

## Configuração futura no Metabase (máquina da professora)

1. Máquina Linux 24h com Docker/Compose, banco interno persistente e backups.
2. Disponibilizar HTTPS com DNS e proxy/túnel de produção aprovado, sem
   exposição de portas do PostgreSQL. Serviços de DNS, certificado TLS e
   reverse proxy podem ser gratuitos; endereço DNS estável e conectividade
   devem ser confirmados no servidor real, não presumidos.
3. Criar administrador inicial pela interface do Metabase e conectar o
   Supabase via role `mae_metabase_reader` (habilitada por canal seguro).
4. Aplicar `python3 scripts/provision.py --apply` depois de configurar
   uma chave de API administrativa em cofre de segredos; validar 4 abas/14 consultas.
5. Admin → Embedding: habilitar **Guest embeds**.
6. Compartilhar o dashboard **via Embed → Guest → Publish** (NÃO public link),
   conferir ID de dashboard e segredo de assinatura em Admin → Embedding.
7. No MAE APS/Vercel, configurar apenas variáveis do lado do servidor:

```dotenv
METABASE_GUEST_EMBED_ENABLED=true
METABASE_PUBLIC_URL=https://HOST-HTTPS-REAL-DO-METABASE
METABASE_DASHBOARD_ID=ID-DO-PAINEL-PUBLICADO
METABASE_GUEST_SECRET_KEY=SEGREDO-DE-GUEST-EMBED-COPIADO-DO-ADMIN
```

**Não usar prefixo `NEXT_PUBLIC_` nessas variáveis, especialmente a chave.**
Não salvá-las no GitHub ou no chat. Ativar na Vercel somente depois de
instância testada, autenticação validada, filtros revisados e CI verde.
**Nunca usar `/public/dashboard/...`, chaves master do Supabase nem iframe público**.

## Limitações obrigatórias do OSS

- Guest embeds mostram o banner **Powered by Metabase**. Não remover à força.
- Guest permite gráficos e filtros, mas não edição, SQL explorer ou
  drill-through; não há SSO/Row and Column Security avançados por pessoa.
- **O bloqueio de downloads dos dados só existe em Pro/Enterprise**:
  usuários autorizados podem exportar resultados agregados. Portanto
  restringir a conexão a views sem dados pessoais, revisar SQL e minimizar
  a granularidade antes de publicar qualquer análise.
- O JWT autoriza o *dashboard inteiro* por 5 minutos e é um bearer token:
  vazamento permite reutilização até expirar. Nunca registrar o token em logs
  ou compartilhar fora do navegador da pessoa autorizada. Após encerrar a
  sessão MAE APS, não são emitidos novos tokens.
- Com `params: {}`, o dashboard é de **visão municipal completa** para perfis
  `gestao` e `leitura`. Se no futuro houver gestão por distrito/UBS,
  os filtros devem ser **Locked**, conectados a todas as perguntas
  e validados no servidor por usuário, ou o escopo deve ser garantido no
  banco de dados. Não usar filtros editáveis como barreira de segurança.
- O servidor Metabase ainda precisará de atualizações, backup, conexão,
  domínio/TLS estável e monitoramento. Software sem licença **não significa**
  que qualquer infraestrutura desconhecida terá custo zero.
- O visual no Metabase OSS é limitado a temas básicos; o MAE APS mantém sua
  própria navegação, cabeçalho e identidade.

## Aceite técnico para ativar sem risco à produção

- Só perfis ativos `gestao` e `leitura` conseguem token válido;
  anônimo, inativo e `admin` devem receber 401/403.
- Token de outro dashboard, token expirado ou adulterado são recusados.
- O endpoint nunca envia segredo ou JWT em logs/cache/URL.
- O Guest Embed está publicado apenas para um dashboard aprovado,
  com queries C3 agregadas e nenhum dado pessoal.
- Safari/iPad e desktop conseguem carregar `embed.js` e dashboard HTTPS;
  CORS, certificado, CSP e disponibilidade precisam de verificação real.
- Dados C3 conferidos contra MAE APS, ausência de dados e exportações auditadas.
- CI completo verde, backup restaurado e autorização do administrador da máquina.

Documentação: https://www.metabase.com/docs/latest/embedding/guest-embedding
e https://www.metabase.com/docs/latest/embedding/securing-embeds .

## Publicação segura e HTTPS grátis

O kit também inclui `compose.https.yaml` e `Caddyfile` com Caddy OSS e certificados ACME automáticos, utilizáveis **somente se o hostname DNS e as portas 80/443 forem liberados pela rede da máquina**. A ativação é opcional; sem hostname/porta não há HTTPS público automaticamente. Consulte `README.md` antes de habilitar. A implantação exige validar o suporte a web components no Safari/iPad e revisar o conteúdo exportável dos gráficos.
