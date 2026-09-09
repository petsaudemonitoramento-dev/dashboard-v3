# Pacote de registro — Cuidado na Gestação na APS, versão 3.0

Documentação reunida para o registro do programa. Cada documento tem um
propósito distinto; a ordem abaixo é a de leitura.

| Documento | Responde a |
|---|---|
| [`IDENTIFICACAO_VERSAO.md`](IDENTIFICACAO_VERSAO.md) | O que é o programa, de quem é, qual versão |
| [`DESCRICAO_FUNCIONAL.md`](DESCRICAO_FUNCIONAL.md) | O que o programa faz, para quem, e o que deliberadamente não faz |
| [`ARQUITETURA_TECNICA.md`](ARQUITETURA_TECNICA.md) | Como está construído, e por que dessa forma |
| [`TECNOLOGIAS.md`](TECNOLOGIAS.md) | Do que depende, em que versões exatas |
| [`ESTRUTURA_CODIGO.md`](ESTRUTURA_CODIGO.md) | Como o código está organizado, e onde está cada regra |
| [`PRIVACIDADE_E_SEGURANCA.md`](PRIVACIDADE_E_SEGURANCA.md) | Que dado pessoal é tratado, como é protegido, o que foi corrigido |
| [`CHANGELOG_V3.md`](CHANGELOG_V3.md) | O que mudou na versão 3.0 e por que houve reescrita |
| [`MANIFESTO_REGISTRO.md`](MANIFESTO_REGISTRO.md) | Commit, resumo SHA-256 e lista completa de arquivos do pacote |

Documentos relacionados, fora deste diretório:

| Documento | Conteúdo |
|---|---|
| [`../VERIFICACAO_V3.md`](../VERIFICACAO_V3.md) | Evidências da bateria de verificação e os quinze cenários |
| [`../SECURITY_DEBT.md`](../SECURITY_DEBT.md) | Dívida técnica de segurança aceita conscientemente |
| [`../IMPLEMENTATION_CONTRACT.md`](../IMPLEMENTATION_CONTRACT.md) | Especificação normativa que orientou a implementação |

## Gerar o pacote

```bash
./scripts/gerar-pacote-registro.sh
```

Requer apenas Python 3 e Git. O script:

1. **recusa rodar** se houver mudança não commitada — um pacote precisa
   corresponder exatamente a um commit, senão o resumo não identifica nada;
2. monta a lista a partir de `git ls-files`, lendo cada arquivo **do commit** e
   não do diretório de trabalho;
3. exclui `.env*`, `node_modules`, `.next`, caches, registros de execução,
   chaves, e planilhas — dado real do SIAPS e do PEC nunca acompanha o código;
4. verifica o conteúdo de cada arquivo incluído contra marcadores de credencial
   e **interrompe a geração** se encontrar algum;
5. grava o ZIP com data fixa e ordem estável, de modo que o pacote seja
   reprodutível byte a byte;
6. escreve o manifesto com commit, ramo, datas, versões principais, a lista
   completa de arquivos com resumo individual, e o resumo do próprio manifesto.

O resultado fica em `dist-registro/`, que não é versionado.

## Conferir um pacote recebido

```bash
sha256sum cuidado-gestacao-aps-v3.0-<commit>.zip
```

O valor deve coincidir com o declarado em `MANIFESTO_REGISTRO.md`. Para conferir
um arquivo isolado dentro do pacote, o manifesto traz o resumo de cada um.
