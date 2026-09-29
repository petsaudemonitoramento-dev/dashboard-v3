# Deploy do MAE APS

## Ambiente

- Node.js 22 ou superior.
- `NEXT_PUBLIC_APP_URL`: origem HTTPS canônica, sem barra final.
- `NEXT_PUBLIC_SUPABASE_URL`: `https://nyexakdyxtstcyycmlng.supabase.co` em produção.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: chave publicável do projeto V3.
- `SUPABASE_SECRET_KEY`: segredo exclusivo do runtime server-side; nunca prefixar com `NEXT_PUBLIC_`.

Confirme no Supabase Auth a URL canônica e `/auth/callback` na allow-list. A Data API remota já usa os schemas atuais. Não vincule ou execute `supabase db reset` contra o remoto.

Em produção, `NEXT_PUBLIC_APP_URL` deve ser exatamente `https://maeaps.vercel.app`.

## Validação

Execute `npm test`, `npm run typecheck`, `npm run lint` e `npm run build`. Execute `db reset` e testes SQL/RLS somente no GitHub Actions. Publique migrations incrementais somente após revisão e backup; o snapshot estrutural não deve ser reaplicado automaticamente no V3 remoto.
