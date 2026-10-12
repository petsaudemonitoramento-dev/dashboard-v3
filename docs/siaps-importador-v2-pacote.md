# Pacote de atualizações — MAE APS Importador Inteligente V2

**Estado:** implementação na branch; NÃO aplicada ao banco nem publicada na Vercel.

## Objetivo das duas primeiras entregas

**Entrega 1 — Descoberta estrutural:** procurar dados C3 em até 16 abas e nos 75 primeiros cabeçalhos, reconhecer apenas aliases explícitos, impedir colunas duplicadas, sinalizar campos desconhecidos, apresentar assinatura da estrutura e diferenças em relação à última publicação com assinatura registrada. Nenhum valor clínico é inventado.

**Entrega 2 — Conciliação e integridade:** não usar substituição integral de competência. Cada registro vigente é identificado por equipe (INE) e competência. Os CNES, onze componentes, denominador, pontos e razão oficial devem coincidir para um registro ser idêntico. Antes de publicar, o servidor produz uma prévia com quatro contagens: novos, idênticos, conflitos e fora da permissão.

A publicação deve ser uma **transação atômica**. Se houver conflito ou equipe não autorizada, **nenhuma linha é publicada**. Arquivos municipais podem ser analisados, mas um editor limitado a uma UBS não publica as demais equipes. Registros ausentes em planilhas parciais **nunca são desativados**.

## Código do pacote

- `src/lib/siaps/discovery.ts`: reconhecimento de abas, aliases e diferenças de estrutura.
- `src/lib/siaps/parser.ts`: integração do reconhecimento, diagnóstico de cabeçalhos e número da aba, limite de tamanho/linhas preservado.
- `src/components/siaps/import-wizard.tsx`: prévia de ações em vez de checkbox "substituir competência".
- `src/app/api/importacoes/route.ts`: passa ID do editor da sessão verificada para RPCs de prévia e publicação; **sem fallback V1/V2**.
- `supabase/migrations/20261012090000_siaps_v3_scoped_reconciliation.sql`: autorização por INE ou município, prévia vinculada ao conteúdo e ao estado atual, bloqueio de concorrência, registro das alterações e audit log.
- `/sistema/administracao/escopos-importacao`: interface para administrador conceder ou revogar os escopos dos perfis `gestao` ativos.
- `supabase/tests/004_siaps_v3_reconciliation.test.sql` e testes `tests/siaps/*-v2*.test.ts`.

## Semântica e alcance

Apenas dados **agregados por equipe** do SIAPS C3; não são prontuários individuais do PEC.

Chave lógica nesta fase: `(municipio IBGE 250400, indicador C3, competência, INE)`.
CNES é checado separadamente, não usado para autorizar outra equipe. O escopo `municipio` vale somente para o município atualmente configurado em Campina Grande.

As alterações de vínculo INE–CNES inesperadas são consideradas conflito, para não reatribuir equipe silenciosamente. Importações retrospectivas não removem períodos seguintes.

A origem marcada `preliminar` permanece explícita; não inferimos automaticamente que uma planilha é `definitiva`.

O SHA-256 vindo do navegador identifica o **arquivo declarado**, mas sozinho não autentica o conteúdo original no servidor. A RPC cria hash independente das **linhas normalizadas recebidas**, compara com a prévia e revalida os campos. Para autenticidade integral do arquivo original será necessária cadeia segura de armazenamento/validação de bytes em etapa posterior.

## Autorização

- Somente perfis `gestao` ativos podem chamar o endpoint de importação.
- A RPC consulta `siaps.c3_editor_scopes`. **Sem escopo cadastrado, tudo é bloqueado**.
- Administradores ativos alteram permissões por RPC transacional; a interface exige confirmação expressa para acesso ao município todo.
- Não existe permissão municipal implícita para toda a Gestão. Atribuir escopos existentes antes de ativar a nova versão.
- O RLS bloqueia acesso direto à tabela de permissões para perfis autenticados; RPCs sensíveis são executáveis exclusivamente pelo `service_role` do backend.

## Concorrência e repetição

Prévia temporária de 20 minutos, vinculada ao editor, arquivo, competência, assinatura de esquema, hash das linhas e estado observado do banco. Publicação usa lock transacional por competência e reexecuta todas as verificações. Se qualquer registro mudou desde a prévia, o editor precisa reanalisar.

Idênticos são preservados sem duplicação. Se não há nenhum dado novo, a operação é registrada como `sem_alteracoes` no audit log.

Os arquivos originais importados e versões existentes permanecem armazenados, incluindo as linhas em `siaps.quality_rows`. A view de analytics deve continuar consultando `is_current`.

## Implantação segura — ordem recomendada

1. **Antes de qualquer deploy**: fazer backup e testar a migração num banco descartável/isolado com schema equivalente e usuários fictícios. Rodar pgTAP completo.
2. Aplicar migração SQL do V2 somente em janela coordenada. Ainda não ativa o endpoint público novo.
3. Atribuir escopos aos editores pelo administrador. Até receberem escopo, não podem publicar (fail-closed).
4. Homologar no preview do Next.js, nas resoluções mobile/desktop e fluxos de múltiplos editores.
5. Trocar a aplicação para V3, nunca permitir fallback de publicação V1/V2.
6. **Após ativar a aplicação V3** e confirmar o fluxo, revogar execute de `publish_siaps_c3_v2` e `publish_siaps_c3_v1` para `service_role`, pois ambas permitem substituição global legada. Fazer isso apenas quando o antigo app não estiver mais recebendo uploads.
7. Se necessário rollback da interface, não restaurar funcionalidade de substituição global sem avaliar os dados parciais publicados no V3.

## Testes obrigatórios antes de mesclar

- `npm ci && npm run typecheck && npm run lint && npm run test && npm run build`.
- `supabase test db` com Postgres e Supabase CLI locais (nunca com banco de produção).
- Dois editores diferentes importando arquivos com INEs em comum no mesmo minuto.
- Município completo após importações por UBS; arquivos iguais com nomes distintos; competências diferentes.
- Equipe existente com campo C3 divergente; vínculo CNES/INE inesperado.
- Revogação de permissão após prévia; reenvio de prévia consumida/vencida; importação parcial antiga.
- Exportações com colunas novas, múltiplas abas C3 e colunas ambíguas.
- Banco e dashboards devem manter todas as equipes que não estão na planilha parcial.

### Limites desta entrega

Não há ainda interface de aprovação/edição dos valores conflitantes. Esses registros são bloqueados para revisão pela gestão e devem ser corrigidos em fonte autorizada ou avaliados em uma etapa separada, sem sobrescrita implícita. O V2 não executa reconhecimento por IA generativa: as decisões de importação são determinísticas e auditáveis.

**Critério de aceite:** zero publicações silenciosas fora de escopo; zero substituições globais; registros idênticos não duplicados; divergências bloqueadas; preflight ligado ao estado transacional no momento da publicação; testes de concorrência e integridade aprovados em ambiente isolado.
