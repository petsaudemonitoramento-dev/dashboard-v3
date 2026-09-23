# Perfis e permissões

| Operação | admin | gestao | leitura |
| --- | :---: | :---: | :---: |
| Dashboard, território e piloto (leitura) | ✓ | ✓ | ✓ |
| Importar SIAPS | ✓ | ✓ | — |
| Alterar território | ✓ | ✓ | — |
| Gerenciar perfis | ✓ | — | — |

Usuário autenticado sem linha ativa em `app.profiles` permanece bloqueado. Guards server-side usam `auth.getUser()` e consultam apenas o perfil próprio. RLS permanece ativa; `TO authenticated` nunca é a única condição de autorização de dados ou mutações. As RPCs privilegiadas verificam `auth.uid()`, perfil ativo e papel, têm `search_path` fixo e registram `audit.events`.

Views expostas ao app devem usar `security_invoker=true`. `audit` e linhas raw de `siaps.quality_rows` não recebem leitura direta de usuários comuns.
