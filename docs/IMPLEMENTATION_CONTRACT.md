# Contrato de implementação — MAE APS V1.0

O **MAE APS — Monitoramento, Atenção e Estratégia na APS** é um software **exclusivo da Gestão**. O futuro software dos profissionais terá outro repositório e infraestrutura própria. Não há módulo Profissional, prontuário, importação PEC nem dados clínicos privados neste projeto.

## Fonte de verdade

O projeto Supabase V3 `nyexakdyxtstcyycmlng` e seus dados publicados são a referência arquitetural. Não resetar nem migrar destrutivamente esse projeto. A cadeia local deve reconstruir o schema de Gestão em banco vazio, sem copiar dados reais. Migrations históricas obsoletas ficam fora da cadeia executável.

## Domínios

- `app.profiles`: `user_id`, `email`, `role` (`admin`, `gestao`, `leitura`) e `active`.
- `core`: distritos, estabelecimentos por CNES, equipes por INE e históricos de vínculo.
- `siaps`: importações, linhas normalizadas, metadados e proveniência.
- `analytics`: C3 mensal por equipe e componentes A–K.
- `study`: dados históricos não expostos como módulo da aplicação.
- `audit`: eventos privilegiados, sem acesso direto de usuários comuns.

Não criar `core.profiles`, `professional`, `analytics_gestao` ou o antigo schema `security`. Não embutir os 14 INEs do piloto em componente, API, importador ou cálculo. Toda equipe importada deve permanecer elegível a análise municipal.

## Acesso

Login, Google OAuth e recuperação de senha usam Supabase Auth e `@supabase/ssr`. Guards server-side chamam `auth.getUser()` e só autorizam perfil próprio em `app.profiles` com `active=true`. `admin` acessa Território e Administração; `gestao` acessa Dashboard e Importação; `leitura` acessa apenas o Dashboard. A autenticação pública não autoatribui papel nem ativa perfil. As mutações de território e perfil revalidam sessão, perfil ativo e papel no banco e registram auditoria. A importação usa rota server-side autorizada, validação duplicada e cliente privilegiado exclusivo do servidor. Nenhum segredo chega ao navegador.

`NEXT_PUBLIC_APP_URL` é obrigatória como origem canônica dos links de autenticação: HTTPS fora de loopback, sem inferência de `Host` ou `X-Forwarded-Host`. `.env.local` nunca é versionado.

## Território e C3

Vínculo distrito → UBS não confirmado permanece ausente. A UBS/equipe segue válida, participa da agregação municipal, aparece como “Não informado” e pode ser filtrada como território não informado.

`pontos_total = 10*A + 9*(B+C+D+E+F+G+H+I+J+K)`. C3 de uma agregação é `SUM(pontos_total) / SUM(denominador)`, nunca média dos percentuais das equipes.

O repositório não fixa totais municipais, número de UBS ou equipes. Todos os valores exibidos são derivados dos dados publicados para a competência e os filtros selecionados.

## Validação

Executar `npm run build`, `npm run lint` e `npm test` localmente. O reset local e os testes SQL/RLS rodam exclusivamente no GitHub Actions. Nunca usar `supabase db reset --linked` no V3 e nunca compensar uma validação pendente com alterações remotas.
