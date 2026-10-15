# MAE APS — Identidade visual das telas pós-login (PR #20)

## Objetivo e limites

Unificar visualmente as interfaces de Gestão, Leitura e Administração com a identidade do MAE APS, respeitando a linguagem usada no login da PR #19. Não alterar algoritmos de indicador C3, importação SIAPS, dados, consultas, fluxos clínicos, permissões, autenticação ou segurança.

## Fontes de referência

- Pasta compartilhada **MAE APS - PET saúde digital** no Drive, com subpastas de símbolo e material de apoio.
- Marcas vetoriais presentes em `public/brands/`, incluindo o símbolo MAE APS, a marca horizontal e a UFCG.
- Variáveis de identidade existentes em `src/app/brand-system.css` e composição aprovada da PR #19.
- As duas referências de login já incorporadas na PR #19.
- ZIP citado pelo solicitante: **não localizado entre os arquivos disponibilizados nesta sessão**. Precisa ser reenviado/verificado antes de alegar correspondência exata com seu conteúdo.

## Inventário visual coberto

| Perfil | Rota | Tipo de interface |
|---|---|---|
| Gestão | `/sistema/gestao` | Visão principal, KPIs, filtros e gráficos |
| Gestão e Leitura | `/sistema/gestao/indicadores` | Indicadores e evolução |
| Gestão e Leitura | `/sistema/gestao/ubs-equipes` | UBS e equipes, tabela e filtros |
| Gestão e Leitura | `/sistema/gestao/comparativos` | Comparativos e gráficos |
| Gestão e Leitura | `/sistema/gestao/resumo` | Resumo e alertas |
| Gestão | `/sistema/importar` | Importador SIAPS e histórico |
| Administração | `/sistema/administracao` | Contas e aprovação |
| Administração | `/sistema/territorio` | Gestão de vínculos territoriais |
| Administração | `/sistema/administracao/escopos-importacao` | Permissões do importador |

## Padrões de design

- **Primário**: `#280063`; intermediário `#49218A`; violeta `#7154B3`.
- **Destaque lilás**: `#AB87F3`, usado somente em superfície decorativa e navegação, sem depender dele para indicar estado clínico.
- **Superfície**: cartões brancos, fundos creme/lilás com gradientes calculados por CSS.
- **Tipografia**: utiliza as fontes do projeto, com títulos reduzidos para notebook e leitura ampliada para módulos.
- **Navegação**: cabeçalho com MAE APS e UFCG, barra lateral roxa no desktop, barra rolável horizontal no mobile.
- **Tabelas**: cabeçalhos lavanda, separadores suaves, rolagem horizontal nas larguras estreitas.
- **Formulários**: foco visível, labels preservados, botões roxos sem alterar os comandos originais.
- **Acessibilidade**: aria-current, navegação por teclado, preferência de movimento reduzido e preservação do skip-link.
- **Cores semânticas**: vermelho/âmbar/verde de erros, êxitos, conflitos e classificações clínicas não são convertidos em roxo.

## Arquitetura

- `src/app/postlogin-identity.css`: folha isolada em `.management-shell`, importada por último para substituir estilos visuais sem vazamento para autenticação.
- `src/components/layout/management-shell.tsx`: um layout único com links distintos por papel.
- `src/app/(sistema)/sistema/layout.tsx`: aplica o layout unificado depois de recuperar a sessão com os guards existentes.
- `tests/e2e/postlogin-identity.spec.ts`: regressão visual estrutural, papéis e mobile.

## Critérios de aceite

1. Páginas protegidas continuam exigindo autenticação válida.
2. Leitura não recebe link de importação nem acesso à publicação.
3. Administração mantém as rotas próprias e não herda a Gestão.
4. Botão de sair preserva a ação original.
5. Filtros, gráficos, tabelas, importação e paginação mantêm funcionamento.
6. Em telas móveis não deve haver transbordamento horizontal do documento.
7. Todos os checks de tipagem, lint, build, RLS/pgTAP e E2E devem passar.
8. Validação visual autenticada de cada perfil antes de aprovação para produção.

Esta PR destina-se a **preview e revisão**. A PR #19 é uma publicação independente.