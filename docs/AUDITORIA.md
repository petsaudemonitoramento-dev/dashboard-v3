# Auditoria da V1

A auditoria institucional permanece no PostgreSQL, na tabela `audit.events`,
com RLS habilitada e sem acesso direto para usuários autenticados. As escritas
ocorrem dentro das RPCs que efetivam a ação, portanto um evento só persiste se a
mudança correspondente concluir na mesma transação.

## Eventos persistidos

| Evento | Ação concluída | Metadados necessários |
| --- | --- | --- |
| `siaps_c3_import_published` | importação C3 publicada atomicamente | competência e quantidade agregada de linhas |
| `profile_access_changed` | papel ou estado de acesso alterado | estado anterior e novo |
| `territory_assignment_changed` | vigência territorial alterada | distrito e vigência anterior/nova |
| `establishment_identity_changed` | nome ou CNES de UBS alterado | valores anteriores e novos |

O evento de importação identifica o usuário de Gestão responsável, mas não
duplica o arquivo XLSX, suas linhas ou seu nome nos metadados de auditoria. O
registro operacional da importação continua em `siaps.imports`.

## Decisões de privacidade e confiabilidade

- IP, User-Agent e identificador de sessão não são coletados: não há finalidade
  institucional ou base LGPD documentada para esses dados nesta V1.
- Não foi criado evento separado de “importação iniciada”. A importação atual é
  síncrona e atômica; gravar o início dentro da transação seria desfeito em uma
  falha, enquanto gravá-lo antes criaria eventos órfãos em quedas do processo.
- Falhas esperadas de arquivo ou validação são apresentadas ao usuário e não
  viram trilha institucional. Exceções internas são enviadas ao Sentry com a
  sanitização definida para a V1, sem payload SIAPS.
- Não foi criado evento de “importação concluída” adicional porque
  `siaps_c3_import_published` já representa exatamente esse estado durável.
- Não há exportação de relatório nesta versão. Quando ela existir, deverá
  registrar conclusão, tipo de relatório e filtros agregados estritamente
  necessários, sem incluir conteúdo exportado ou dados do navegador.

Os pgTAP verificam que uma publicação gera um único evento, associa o ator
correto, limita os metadados a competência/contagem e não inclui identificadores
de rede ou sessão. Como o ambiente local desta máquina não usa Docker, esses
testes são executados no gate Linux do GitHub Actions.
