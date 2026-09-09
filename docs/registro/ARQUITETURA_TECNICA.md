# Arquitetura técnica

## Visão geral

Aplicação web de página renderizada no servidor, com banco de dados relacional
PostgreSQL. Não há servidor de aplicação separado: as rotas do Next.js executam
no servidor e falam diretamente com o banco, autenticadas como o usuário da
sessão.

```
Navegador
   │  (sessão em cookie httpOnly)
   ▼
Next.js (App Router, Server Components e Server Actions)
   │  guards de rota  ·  parsers  ·  validação de entrada
   ▼
PostgREST / Supabase  ──  autenticação, OAuth, Storage privado
   ▼
PostgreSQL
   ├── core             território e perfis
   ├── professional     dado assistencial, isolado por proprietário
   ├── siaps            base bruta imutável do relatório oficial
   ├── analytics_gestao fatos e visões do indicador
   ├── security         funções privilegiadas
   └── audit            trilha de auditoria
```

## Princípio estruturante: o cálculo mora no banco

Nenhum indicador é recomposto em TypeScript para exibição. Todo número do painel
vem de uma *view* de `analytics_gestao`. A aplicação lê e apresenta; não decide.

Isso não é preferência de estilo. É o que permite que um segundo consumidor —
uma ferramenta de BI, uma exportação, um relatório — leia **exatamente** o mesmo
número, sem reimplementar a regra. Uma regra duplicada em duas linguagens é uma
regra que vai divergir; a única questão é quando.

O TypeScript calcula em dois pontos, e só neles: a **prévia** da importação,
declarada como informativa na própria tela, e o **checksum** de conferência do
arquivo. Nenhum dos dois é a fonte do número publicado.

## Os seis schemas

A separação por schema é o mecanismo de isolamento, não uma organização
cosmética. Um perfil sem `usage` no schema não alcança nada dentro dele, por
mais que a interface se confunda.

| Schema | Conteúdo | Quem alcança |
|---|---|---|
| `core` | Perfis, distritos, estabelecimentos, equipes e suas vigências | Leitura conforme o perfil |
| `professional` | Pacientes, importações do PEC, atendimentos, exames, vacinas, avaliações de risco | Somente o profissional proprietário |
| `siaps` | Importações e linhas brutas do relatório oficial | Somente Gestão Municipal |
| `analytics_gestao` | Fatos do C3 por equipe e por prática; visões agregadas | Somente Gestão Municipal |
| `security` | Funções privilegiadas de autorização e mutação | Executável, nunca legível |
| `audit` | Trilha de auditoria | **Ninguém**, pela aplicação |

`audit.events` tem RLS habilitado e nenhuma política, de propósito: é o estado
mais restritivo possível. A trilha é escrita por funções `security definer` e não
é legível por `authenticated`. Uma auditoria que o auditado consegue ler ou
apagar não é auditoria.

A Data API expõe apenas os schemas necessários. `audit` nunca é exposto.

## Autorização em duas camadas

### Camada 1 — guard no servidor

Toda página privada chama `enforceRouteGuard`. O guard exige, cumulativamente:
sessão válida (`auth.getUser()`, não o cookie), perfil existente, não removido,
não bloqueado, ativo, cadastro completo, aprovado, e o papel correto para a área.

A ordem de precedência é fixa e testada: **removido → bloqueado → inativo →
incompleto → rejeitado → pendente**. Um perfil bloqueado *e* aprovado é
bloqueado.

Não existe `middleware.ts`. É deliberado: o *middleware* do Next.js executa em
um contexto de borda e não é um limite de segurança adequado para dados. A
proteção acontece por página, no servidor, e tem uma segunda camada abaixo.

### Camada 2 — RLS no PostgreSQL

Se um guard fosse esquecido em uma rota nova, o banco ainda recusaria. Toda
tabela de dado tem *row level security* habilitado, com política por
proprietário (`owner_user_id = auth.uid()`) ou por papel ativo
(`security.is_active_role(...)`).

Duas decisões específicas sustentam isso:

- **`security_invoker = true` em todas as views.** Sem esse atributo, uma view
  executa com os direitos de quem a criou e **vaza por baixo do RLS**. É o erro
  clássico de exposição por view, e as visões de paciente são testadas
  justamente contra ele.
- **`security definer` sempre com `set search_path = ''`.** Uma função
  privilegiada com `search_path` herdado pode ser induzida a chamar um objeto
  plantado pelo chamador. Todos os nomes são qualificados.

`security.is_active_role` é o predicado único de papel. Existe um só lugar que
decide o que é "um perfil ativo com este papel", e ele é `security definer` para
que a própria checagem não dependa do RLS que está protegendo.

## Motor do indicador C3

### A fórmula

```
pontos(equipe)     = 10 × A + 9 × (B + C + D + E + F + G + H + I + J + K)
C3(qualquer nível) = SOMA(pontos) / SOMA(denominador)
```

A primeira boa prática — captação precoce — pesa 10; as outras dez pesam 9 cada.
Os onze pesos somam exatamente 100, e há teste que afirma isso.

### Por que a recomposição é aditiva

Porque o C3 é uma **razão**, e a razão de um conjunto não é a média das razões
das partes. Uma equipe com 3 gestantes e uma com 40 não têm o mesmo peso no
resultado da unidade. No dado real de Campina Grande, a média simples se afasta
do valor correto em até 3,49 pontos no nível da unidade — um erro que muda a
classificação de uma unidade de faixa.

O programa nunca faz média de percentuais. Soma numeradores, soma denominadores,
divide.

### Denominador zero

`SOMA(denominador) = 0` devolve **nulo**, não zero. Na tela, *"Sem população
elegível"*. Uma equipe cujo território não tem gestantes elegíveis não é uma
equipe *Regular*; classificá-la assim inverteria o sentido do indicador.

### Faixas

| Faixa | Intervalo |
|---|---|
| Ótimo | acima de 75 até 100 |
| Bom | acima de 50 até 75 |
| Suficiente | acima de 25 até 50 |
| Regular | até 25 |

Os limites são fechados à direita e abertos à esquerda, e cada fronteira tem
teste próprio — 75,01 é Ótimo, 75 é Bom, 25 é Regular.

## Modelo territorial

O território é resolvido **na competência**, não no estado atual. Uma equipe que
mudou de unidade em abril precisa aparecer na unidade certa em cada mês da série;
usar o vínculo de hoje reescreveria o passado.

Isso é feito com tabelas de vigência — `core.establishment_district_validity` e
`core.team_establishment_validity` — consultadas pela data da competência.

Duas escolhas de identificação:

- **INE e CNES são texto, não número.** O INE tem dez dígitos com zeros à
  esquerda; convertê-lo para número destrói o identificador. Há teste que recusa
  um INE que perdeu os zeros.
- **A identidade vem do código, nunca do nome.** Nome de equipe e de unidade
  mudam de grafia entre competências; CNES e INE não. O par INE→CNES observado
  no relatório é registrado como vínculo, e é ele que sustenta o drill-down.

O relatório traz o CNES e o INE **como o SIAPS os informou**, preservados. A
classificação de tipo de unidade (UBS, policlínica, âncora, outro) e a decisão
de participação no painel (`includes_panel`) são do município, guardadas
separadamente do dado da fonte. Assim a base bruta permanece fiel ao SIAPS
mesmo quando a regra municipal muda.

## Ingestão e versionamento

`siaps.ingest_quality_report` recebe metadados e linhas já normalizados pelo
parser e grava em uma transação. `siaps.publish_import` é um passo distinto:
importar não publica.

- A base bruta é **append-only**. Gatilhos bloqueiam `update` e `delete` em
  `siaps.quality_rows`.
- A identidade do arquivo é o **resumo SHA-256 do conteúdo**, não o nome.
- A precedência entre versões é o **`generated_at` do SIAPS**, não o horário do
  envio.
- A comparação de recorte usa uma **assinatura de escopo** normalizada dos
  filtros do relatório. Recortes diferentes não se substituem em silêncio.
- Mutações administrativas de perfil são serializadas por
  `pg_advisory_xact_lock`, para que duas remoções simultâneas de administrador
  não possam, juntas, deixar o sistema sem nenhum.

## Módulo Profissional

Cada tabela carrega `owner_user_id`, propagado por gatilho a partir da paciente
(`professional.inherit_owner`) — um registro filho não pode acabar com um dono
diferente do da paciente por descuido de quem escreve o `insert`.

`professional.import_pec_batch` faz a importação inteira em uma transação:
registra o arquivo pelo resumo, recusa reimportação, e desduplica por
`dedup_key`. **Nenhuma tabela do módulo tem coluna de CPF ou CNS.**

## Autenticação

Sessão em cookie `httpOnly`, gerenciada pelo Supabase. E-mail e senha, ou Google
OAuth. Todos os links enviados por e-mail — confirmação, OAuth e recuperação de
senha — são montados a partir de `NEXT_PUBLIC_APP_URL`, a origem canônica
configurada. **Nenhum cabeçalho da requisição participa dessa decisão**, o que
fecha o envenenamento do link de recuperação por `X-Forwarded-Host`.

O destino pós-autenticação passa por `safeNext`, que resolve o valor contra a
origem canônica e recusa qualquer coisa que saia dela — inclusive as formas que
enganam validação por prefixo, como `//evil.com` e `/\evil.com`.
