# Descrição funcional

## Problema que o programa resolve

O indicador **C3 — Boas práticas no pré-natal** é publicado pelo SIAPS de forma
agregada, em planilhas por competência mensal. Um município que queira usar esse
número para gerir a rede enfrenta três dificuldades práticas:

1. o relatório chega equipe a equipe, sem o encadeamento território → distrito →
   unidade → equipe que a gestão precisa para agir;
2. recompor o número por unidade ou por distrito com média simples produz um
   valor **errado**, porque o indicador é uma razão ponderada e não um
   percentual médio;
3. o profissional que acompanha as gestantes não tem, no mesmo lugar, a visão
   da própria carteira — e não deveria ter acesso ao dado de outros.

O programa resolve os três, e mantém os dois públicos rigorosamente separados.

## Perfis de usuário

O programa reconhece **três** perfis, e apenas três.

| Perfil | O que vê | O que não vê |
|---|---|---|
| **Administrador** | Cadastro e situação dos usuários; trilha de auditoria das próprias ações | **Nenhum dado clínico.** Nenhuma paciente, nenhum atendimento, nenhum exame |
| **Gestão Municipal** | Indicador oficial em todos os níveis territoriais; importação e publicação das competências | Nenhum dado clínico. A gestão trabalha sobre agregados do SIAPS, que não contêm pessoa alguma |
| **Profissional** | Exclusivamente a própria carteira de gestantes | A carteira de qualquer outro profissional; qualquer dado do painel de gestão |

Que o Administrador não alcance dado clínico não é uma escolha de interface: é
uma consequência das permissões do banco, verificada em teste. Administrar
pessoas e ler prontuário são coisas distintas, e o poder de uma não deve
comprar a outra.

## Ciclo de vida do acesso

Todo cadastro público nasce com **acesso pendente**. Nenhum usuário se
promove. Ao completar o cadastro, o usuário solicita o perfil de **Profissional**
ou **Gestão Municipal**. A solicitação não concede acesso automaticamente e o
perfil **Administrador** não pode ser solicitado publicamente. A sequência é:

1. **Cadastro** por e-mail e senha, ou por conta Google.
2. **Confirmação ou autenticação** do e-mail.
3. **Completar cadastro** — dados pessoais e perfil de acesso solicitado.
4. **Solicitação de acesso** como Profissional ou Gestão Municipal.
5. **Aprovação** por um Administrador, que efetiva ou redefine o perfil.
6. **Acesso** à área correspondente ao perfil aprovado.

Um Administrador pode, a qualquer momento, aprovar, rejeitar, ativar, inativar,
bloquear, desbloquear e redefinir o perfil de um usuário. Duas invariantes são
impostas pelo banco, não pela tela: um administrador **não** pode bloquear ou
rebaixar a si mesmo, e o **último administrador ativo não pode ser removido** —
caso contrário o sistema ficaria sem quem o administre.

Toda mudança de aprovação, de perfil e de bloqueio é registrada em trilha de
auditoria, com autor, alvo e momento.

## Módulo Gestão Municipal

### Importação do relatório SIAPS

A fonte de ingestão é **um único relatório**: *Qualidade — Visão por
Competência*. As demais visões do SIAPS (por Equipe, por Indicador) não são
aceitas, e o programa as recusa explicitamente em vez de tentar interpretá-las.
A razão é que as séries por equipe são **reconstruídas** a partir das
competências: aceitar duas fontes para o mesmo número abriria espaço para que
elas divergissem.

O fluxo tem dois passos separados, de propósito:

- **Analisar** — o arquivo é lido e conferido, sem gravar nada. A tela mostra a
  competência, o município, o momento de geração no SIAPS, o número de equipes,
  o denominador, os pontos e o resultado recomposto.
- **Gravar e publicar** — só depois da conferência. O arquivo é reprocessado no
  servidor; o resultado exibido no navegador nunca é aceito como verdade, porque
  isso permitiria forjar um indicador oficial.

O programa recusa, com mensagem explícita:

- relatório de outro município;
- indicador diferente do C3;
- competência anterior ao início da série oficial;
- arquivo já importado (pelo resumo do conteúdo, não pelo nome);
- linha cujo valor não é numérico, em vez de convertê-la em zero;
- INE que perdeu os zeros à esquerda por ter sido tratado como número;
- INE repetido na mesma competência.

Cada linha é conferida contra a fórmula oficial: `pontos = 10×A + 9×(B..K)`. Se
o arquivo não reproduz a própria soma, o programa avisa em vez de publicar — ou
o arquivo foi alterado, ou a metodologia mudou, e nos dois casos a publicação
silenciosa seria pior que o erro.

### Versionamento e substituição

Uma competência pode ser reimportada. Qual versão prevalece é decidido pelo
**momento em que o SIAPS gerou o relatório**, não pelo horário do envio. Enviar
hoje um arquivo gerado no mês passado não sobrescreve um mais recente. Se o
conjunto de filtros do relatório novo difere do publicado, a substituição é
bloqueada e exige revisão: dois recortes diferentes não são duas versões do
mesmo dado.

A base bruta é **imutável**. Linhas importadas não podem ser alteradas nem
apagadas — o banco impede. A correção de uma competência se faz publicando outra
versão, com a anterior preservada.

### Painel

O painel apresenta o C3 em quatro níveis, com o mesmo número em todos:
**Município → Distrito → Unidade (CNES) → Equipe (INE)**, mais a leitura por
boa prática, que mostra onde os pontos estão sendo perdidos.

Duas decisões de método aparecem na tela:

- **A recomposição é aditiva**, `SOMA(pontos) / SOMA(denominador)`, nunca média
  dos percentuais. A diferença não é cosmética: no dado real de Campina Grande
  a média simples erra em até 3,49 pontos no nível da unidade.
- **Denominador zero não é nota zero.** Uma equipe sem gestantes elegíveis
  aparece como *"Sem população elegível"*, jamais como *Regular*. Tratar
  ausência de população como mau desempenho puniria a equipe pelo território.

A classificação segue as faixas oficiais: **Ótimo** acima de 75 até 100, **Bom**
acima de 50 até 75, **Suficiente** acima de 25 até 50, **Regular** até 25.

### Escopo do painel

Por determinação da gestão municipal, **policlínicas não entram nas análises**.
A exclusão é feita no banco, por lista positiva de estabelecimentos, e não por
filtro visual: um filtro de tela pode ser contornado mudando a URL, e o número
oficial não pode depender disso. Se um relatório trouxer uma policlínica, ela é
**excluída com motivo registrado**, não rejeitada — e o painel informa quantas
equipes ficaram de fora e por quê, para que a diferença de contagem em relação
ao SIAPS seja explicável.

Um CNES desconhecido não é adivinhado: fica pendente de revisão.

## Módulo Profissional

Área privada, isolada do módulo de gestão. O profissional importa a própria
planilha exportada do PEC e passa a acompanhar a carteira dentro do programa.

- **Importação tolerante na leitura, estrita no valor.** O programa reconhece
  variações de cabeçalho comuns do PEC — acento, caixa, pontuação —, mas recusa
  a linha inteira quando um valor é inválido. Um campo vazio nunca vira zero, e
  `"12abc"` nunca vira `12`.
- **Datas** em formato brasileiro, ISO ou série do Excel.
- **Desduplicação** por nome normalizado e data de nascimento, para reconhecer a
  mesma gestante entre importações sem depender de documento. Quando falta a
  data de nascimento, o programa **não** deduplica e avisa — juntar duas pessoas
  por homonímia seria pior que duplicar.
- **Reimportação do mesmo arquivo é recusada**; reimportar a mesma pessoa em
  arquivo diferente **atualiza**, não duplica.
- **Visão geral e alertas** por gestante, respeitando o isolamento por
  proprietário inclusive nas visualizações.

## Separação entre os módulos

O dado assistencial do módulo Profissional **não participa do indicador
oficial**, e a importação do SIAPS **não cria paciente alguma**. As duas coisas
são verificadas por teste automatizado. É a garantia central do produto: o
número institucional continua sendo o do SIAPS, auditável contra a fonte, e o
acompanhamento clínico continua sendo do profissional que o conduz.
