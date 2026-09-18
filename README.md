# Dashboard V3 — Gestão

Software exclusivo da Gestão municipal para dados SIAPS e análises C3. A arquitetura vigente está em [docs/IMPLEMENTATION_CONTRACT.md](docs/IMPLEMENTATION_CONTRACT.md).

## Desenvolvimento

1. `npm install`
2. Configure `.env.local` a partir de `.env.example`, somente com URL/chave publicável do V3 e `NEXT_PUBLIC_APP_URL`.
3. `npx supabase start` e `npx supabase db reset` **sem `--linked`**, apenas com Docker local.
4. `npx supabase test db`, `npm test`, `npm run lint` e `npm run build`.

Nunca versione `.env.local`, use service-role no navegador ou credenciais V2. O projeto Supabase remoto contém dados reais JAN–JUN/2026 e não pode ser resetado.

As migrations em `supabase/migrations/` reproduzem somente a arquitetura de Gestão em banco vazio. As migrations antigas da PR #2 foram preservadas em `supabase/archive/phase1/`, fora da cadeia executável. O snapshot estrutural local não deve ser enviado automaticamente ao V3 remoto, cuja história já avançou.

O acesso de uma conta autenticada depende de uma linha ativa em `app.profiles`. A arquitetura remota atual permite apenas leitura do próprio perfil pelo usuário: o provisionamento de acessos ainda é uma operação institucional controlada, não uma mutação do navegador.

Antes do deploy, confirme a configuração da Data API remota: a configuração observada no role `authenticator` ainda cita schemas legados e não inclui `app`, `analytics` e `study`. A configuração local já usa os schemas atuais; nenhuma mudança de exposição foi feita no V3 remoto.
