# Contrato de implementação — Dashboard V3 da Gestão

Esta versão substitui o contrato anterior da Fase 1. O Dashboard V3 é um software **exclusivo da Gestão**. O futuro software dos profissionais terá outro repositório e infraestrutura própria. Não há módulo Profissional, prontuário, importação PEC nem dados clínicos privados neste projeto.

## Fonte de verdade

O projeto Supabase V3 `nyexakdyxtstcyycmlng` e seus dados publicados são a referência arquitetural. Não resetar nem migrar destrutivamente esse projeto. A cadeia local deve reconstruir o schema de Gestão em banco vazio, sem copiar dados reais. Migrations históricas obsoletas ficam fora da cadeia executável.

## Domínios

- `app.profiles`: `user_id`, `email`, `role` (`admin`, `gestao`, `leitura`) e `active`.
- `core`: distritos, estabelecimentos por CNES, equipes por INE e históricos de vínculo.
- `siaps`: importações, linhas normalizadas, metadados e proveniência.
- `analytics`: C3 mensal por equipe e componentes A–K.
- `study`: coortes analíticas e membros. O piloto 2026 é apenas uma coorte.
- `audit`: eventos privilegiados, sem acesso direto de usuários comuns.

Não criar `core.profiles`, `professional`, `analytics_gestao` ou o antigo schema `security`. Não embutir os 14 INEs do piloto em componente, API, importador ou cálculo. Toda equipe importada deve permanecer elegível a análise municipal.

## Acesso

Login, Google OAuth e recuperação de senha usam Supabase Auth e `@supabase/ssr`. Guards server-side chamam `auth.getUser()` e só autorizam perfil próprio em `app.profiles` com `active=true`. `admin` acessa a área administrativa; `gestao` e `leitura` acessam a área de Gestão. A autenticação pública não autoatribui papel nem ativa perfil. A arquitetura atual não oferece RPC de mutação administrativa: o navegador não deve tentar atualização direta nem usar chave service-role. Uma futura API de provisionamento exige autorização e auditoria próprias.

`NEXT_PUBLIC_APP_URL` é obrigatória como origem canônica dos links de autenticação: HTTPS fora de loopback, sem inferência de `Host` ou `X-Forwarded-Host`. `.env.local` nunca é versionado.

## Território e C3

Vínculo distrito → UBS não confirmado permanece ausente. A UBS/equipe segue válida, participa da agregação municipal, aparece como “Não informado” e pode ser filtrada como território não informado.

`pontos_total = 10*A + 9*(B+C+D+E+F+G+H+I+J+K)`. C3 de uma agregação é `SUM(pontos_total) / SUM(denominador)`, nunca média dos percentuais das equipes.

| Competência | Equipes | Denominador | C3 |
| --- | ---: | ---: | ---: |
| JAN/26 | 203 | 2.595 | 36,33 |
| FEV/26 | 203 | 2.540 | 36,24 |
| MAR/26 | 187 | 2.492 | 37,23 |
| ABR/26 | 153 | 2.423 | 37,51 |
| MAI/26 | 157 | 2.467 | 37,49 |
| JUN/26 | 156 | 2.443 | 36,83 |

## Validação

Executar `npm run build`, `npm run lint`, `npm test`, `supabase db reset` local e testes SQL/RLS. Nunca usar `supabase db reset --linked` no V3. Sem Docker ou outra dependência local, registrar essa validação como pendente sem compensá-la com alterações remotas.
