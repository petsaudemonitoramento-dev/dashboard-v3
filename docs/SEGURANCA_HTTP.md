# Segurança HTTP

Os headers são definidos uma única vez em `src/config/security-headers.ts` e
aplicados a todas as rotas pelo `next.config.ts`.

## Proteções ativas

- HSTS por um ano, incluindo subdomínios;
- `X-Content-Type-Options: nosniff`;
- bloqueio de framing por CSP e `X-Frame-Options`;
- `Referrer-Policy: strict-origin-when-cross-origin`;
- câmera, microfone e geolocalização desabilitados;
- CSP restringindo `base-uri`, `form-action`, objetos incorporados e framing.

A CSP é deliberadamente incremental. Nesta V1 ela não declara `script-src`,
`style-src`, `connect-src`, `img-src` ou `font-src`: uma allow-list genérica
nessas diretivas poderia quebrar os scripts do Next.js, o fluxo PKCE/OAuth, as
conexões do Supabase, os gráficos ou o envio de exceções ao Sentry.

Antes de ampliar a política, execute-a como `Content-Security-Policy-Report-Only`
em staging, percorra login por senha, Google OAuth, recuperação, dashboards,
importação e captura Sentry, e revise os relatórios. Só promova diretivas que
tenham uma origem justificada; não use curingas para silenciar violações.

O Vitest verifica a configuração e o Playwright confere os headers da resposta
real no runner do GitHub. HSTS só produz efeito quando a aplicação é servida por
HTTPS.
