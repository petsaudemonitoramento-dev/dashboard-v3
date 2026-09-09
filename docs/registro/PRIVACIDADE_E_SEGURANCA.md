# Privacidade e segurança

## Dados pessoais tratados

### Cadastro de usuário (profissionais e gestores)

| Dado | Finalidade |
|---|---|
| E-mail | Identificação, autenticação e comunicação do sistema |
| Nome completo | Identificação do responsável pelo registro |
| Telefone | Contato institucional |
| Registro profissional | Verificação do vínculo pelo Administrador |

### Dados de saúde (módulo Profissional)

| Dado | Finalidade |
|---|---|
| Nome de exibição da gestante | Reconhecimento pelo profissional que a acompanha |
| Data de nascimento | Desduplicação entre importações e cálculo de idade |
| Data de início do pré-natal, data provável do parto | Acompanhamento do cuidado |
| Classificação de risco | Priorização clínica |
| Atendimentos, exames, vacinas, avaliações de risco | Acompanhamento do cuidado |

### O que o programa deliberadamente **não** guarda

**Não existe coluna de CPF nem de CNS em nenhuma tabela do programa.**

Foi uma decisão de projeto, não uma omissão. O reconhecimento da mesma gestante
entre importações é feito por nome normalizado somado à data de nascimento —
suficiente para o uso real, e que não constitui uma base de identificadores
nacionais.

Foi considerada e **descartada** a alternativa de guardar `SHA256(CPF)` como
chave determinística. Um resumo simples de CPF é reversível por força bruta em
minutos: o espaço de CPFs válidos é pequeno o bastante para ser enumerado por
inteiro. Guardar esse resumo seria guardar o CPF com uma camada de aparência de
proteção — pior que não guardar, porque induz confiança indevida. Se um
identificador determinístico vier a ser necessário, a via correta é
pseudonimização no servidor com HMAC e segredo exclusivo do servidor, jamais
exposto ao navegador, ao versionamento ou aos registros de execução.

O módulo de gestão não trata dado pessoal algum: o relatório do SIAPS é agregado
por equipe e não contém pessoa alguma.

## Bases legais e princípios (LGPD)

- **Finalidade** — o tratamento se limita ao acompanhamento do cuidado pré-natal
  na APS e ao monitoramento de indicador oficial de saúde pública.
- **Necessidade** — nenhum dado é coletado "por precaução". A ausência de CPF e
  CNS é a expressão concreta disso.
- **Segurança** — descrita abaixo, e verificada por testes automatizados.
- **Prestação de contas** — toda ação administrativa privilegiada é auditada,
  em trilha que a própria aplicação não consegue ler nem apagar.

## Isolamento do dado clínico

O isolamento é imposto pelo banco, em camadas independentes.

1. **Propriedade.** Cada registro clínico carrega `owner_user_id`. A política de
   RLS exige `owner_user_id = auth.uid()` para ler, inserir, atualizar e apagar.
   O proprietário é propagado por gatilho a partir da paciente, para que um
   registro filho não possa acabar com dono diferente.
2. **Impossibilidade de transferência.** Um profissional não cria registro em
   nome de outro nem transfere paciente para outro. Ambos são testados.
3. **Separação por schema.** Gestão e Administrador não têm concessão alguma em
   `professional`. Não é um filtro que se possa esquecer de aplicar: a permissão
   não existe.
4. **Views com `security_invoker`.** Toda *view* executa com os direitos de quem
   a consulta. Sem esse atributo, uma *view* roda com os direitos do criador e
   **contorna o RLS** — é o modo mais comum de vazar dado por engano. As duas
   *views* de paciente são testadas exatamente contra isso.

**O Administrador não acessa dado clínico.** Administrar usuários e ler dado de
saúde são poderes distintos, e um não compra o outro. Verificado em teste.

## Autenticação e sessão

- Sessão em cookie `httpOnly`, gerenciada pelo Supabase. O servidor valida
  `auth.getUser()` — não confia no conteúdo do cookie.
- Um perfil ativo exige, cumulativamente: existir, não estar removido, não estar
  bloqueado, estar ativo, ter cadastro completo e estar aprovado.
- Todo cadastro nasce **Profissional pendente**. Ninguém se promove: o perfil só
  muda por ação de um Administrador, através de função `security definer` que
  revalida o papel no banco.
- **A chave `service_role` nunca chega ao navegador.** A validação do ambiente
  recusa uma chave que contenha `service_role` no conjunto público, e a aplicação
  não sobe.

## Correções de segurança aplicadas nesta versão

Uma auditoria formal precedeu esta versão. Os achados crítico e altos foram
corrigidos antes do desenvolvimento funcional prosseguir.

| ID | Severidade | Achado | Correção |
|---|---|---|---|
| **C1** | Crítico | `NEXT_PUBLIC_APP_URL` era opcional; na falta dela a origem dos links de autenticação vinha dos cabeçalhos da requisição. Um `X-Forwarded-Host` forjado envenenava o **link de recuperação de senha**, entregando o token de redefinição a um domínio do atacante — tomada de conta sem interação da vítima além de clicar em um e-mail legítimo | A variável passou a ser **obrigatória**, com HTTPS exigido fora de *loopback* e sem barra final. `canonicalOrigin()` lê somente a configuração; **nenhum cabeçalho participa** |
| **A1** | Alto | Redirecionamento aberto no retorno da autenticação. A validação por prefixo aceitava `/\evil.com`, que o navegador resolve como `https://evil.com/` | `safeNext` resolve o destino contra a origem canônica e compara a origem resultante; recusa barra invertida e byte nulo. Onze casos testados |
| **A2** | Alto | Troca de senha podia falhar em silêncio quando o Supabase exigia reautenticação | Reconhecimento explícito de `reauthentication_needed`, por código e por mensagem. **A senha atual não é exigida na recuperação** — a sessão da recuperação é nova, e o "Secure password change" só exige reautenticação acima de 24 h |
| **A3** | Alto | Mensagens de erro devolviam detalhe do provedor ao usuário | Mensagens genéricas na interface; o detalhe não sai do servidor |
| **M1** | Médio | `complete_profile` permitia que um perfil bloqueado ou rejeitado reescrevesse os próprios dados | Guardas de ciclo de vida na função |
| **M2** | Médio | Era possível remover o último administrador ativo, deixando o sistema sem quem o administre | Invariante verificada após a mutação, sob `pg_advisory_xact_lock` para que duas remoções simultâneas não passem juntas |
| **B1** | Baixo | Um código novo de negativa faria o redirecionamento retornar indefinido | Nega por padrão diante de código desconhecido |

Dívida técnica aceita conscientemente — M3, M4, B2 a B6 — está registrada em
`../SECURITY_DEBT.md`, com risco, localização e correção proposta para cada
item. Nenhuma delas é exploração remota; a mais relevante é a ausência de
captcha e de exigência de complexidade de senha (M4), que depende de
configuração no painel do provedor.

## Verificação independente

O **Supabase Security Advisor** foi executado sobre o projeto e reporta
**0 ERROR**. Os avisos remanescentes e o motivo pelo qual `audit.events` aparece
sem política — é o estado mais restritivo possível, e é intencional — estão
descritos em `../VERIFICACAO_V3.md`.

`npm audit` reporta **0 vulnerabilidades**.

## Armazenamento de arquivos

Os *buckets* de origem (`siaps-source`, `territorio-source`,
`professional-source`) são **privados**. Há teste que afirma que nenhum deles é
público. Arquivos do módulo Profissional usam `auth.uid()` como primeiro
segmento do caminho, e a política de Storage compara esse segmento com o usuário
da sessão. Os demais *buckets* não aceitam acesso direto de usuário.

## Registros de execução

Nenhum dado pessoal é escrito em console ou em mensagem de erro exibida ao
usuário. As mensagens de falha da aplicação são genéricas por decisão — a
alternativa, devolver o detalhe do provedor, vazava informação sobre contas
existentes.

## Segredos

Nenhum segredo é versionado. O repositório contém apenas `.env.example`, com
valores de exemplo. `.env.local` e derivados são ignorados pelo versionamento e
excluídos do pacote de registro por regra explícita do script gerador.
