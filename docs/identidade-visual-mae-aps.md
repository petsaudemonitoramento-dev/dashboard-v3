# Identidade visual do MAE APS — aplicação no software

Referência: **PLATAFORMA GESTÃO.pdf**, manual de identidade visual entregue para o projeto (especialmente pp. 20–36).

## Fundamentos do manual

- **Ideia visual:** união, acolhimento, integração de dados e cuidado humano. A letra M foi desenhada para sugerir proteção e afeto (p. 20). Não redesenhar a marca em texto genérico.
- **Cores oficiais** (p. 24): roxo escuro `#280063`, laranja `#F44E04`, roxo acinzentado `#5C4798`, azul `#284FD8`, branco creme `#F9F3EF` e lilás `#AB87F3`.
- **Fontes indicadas** (p. 26): Garet para a comunicação principal e Clear Sans como apoio.
- **Usos da marca:** preservar área de não interferência (p. 31), tamanho mínimo de legibilidade (p. 32), cor monocromática quando necessário (p. 33), contraste apropriado sobre fundos coloridos e instáveis (pp. 34–35). Não modificar a estrutura gráfica (p. 36).

## Implementação técnica

| Camada | Fonte de verdade | Aplicação |
| --- | --- | --- |
| Cores e tipografia de CSS | `src/app/brand-system.css` | Login, Gestão, Administração, Território, SIAPS, filtros, cartões e links |
| Cores de elementos em JavaScript/TypeScript | `src/lib/design/mae-brand.ts` | Gráficos ECharts (com semântica mantida) |
| Marca oficial | `public/brands/` | Arquivos SVG já aprovados no projeto |
| Tipografia da interface | `@fontsource/clear-sans` | Pesos 400, 500 e 700; arquivos de fonte embarcados via dependência Apache-2.0 |
| Tipografia de títulos | `--mae-font-display` | Garet quando existir licença web e arquivos próprios; alternativa Clear Sans enquanto isso |

### Licença de fontes: ponto pendente

A fonte **Garet** é proprietária e requer permissão de uso/incorporação para páginas web. O manual identifica a família, mas **não concede licença** para distribuir arquivos. Não extraímos fontes embutidas no PDF. Até obter a versão de fonte autorizada da designer/titular da licença, os títulos usam Clear Sans de forma segura. Se forem fornecidos arquivos webfont com direitos de uso adequados, configurar `@font-face` para Garet no projeto; não criar substituições piratas.

### Semântica de indicadores e segurança

As cores de **alerta, erro, sucesso, risco, incompletude ou comparação clínica** não devem ser alteradas apenas por identidade visual. Revisar contraste WCAG, estado de foco, diferenciação com texto e legenda antes de adaptar qualquer dado médico. A identidade de marca não significa certificação de acessibilidade.

## Rodapé de autenticação

- **Desktop**: marca institucional UFCG à esquerda; referências do SIAPS e LGPD alinhadas geometricamente ao eixo do formulário; créditos à direita, tudo em uma única faixa.
- **Mobile**: logo UFCG + nome completo, depois SIAPS/C3/LGPD e créditos compactos. Referência de data e origem SIAPS/SISAB acessíveis via **Referências técnicas** (expansível).
- Não criar scroll interno ao rodapé. O documento pode rolar em telas muito baixas, zoom ampliado ou teclado virtual.

## Checklist antes de publicar

1. Conferir `npm ci`, `npm run typecheck`, `npm run lint`, `npm run test` e `npm run build` com dependências instaladas.
2. Testar páginas `/entrar`, `/cadastro`, `/recuperar-senha`, `/sistema/gestao`, `/sistema/importar`, `/sistema/administracao`, `/sistema/territorio`.
3. Testar 320×568, 375×667, 390×844, 768×1024, 1366×768 e desktop grande; no zoom 200%; com teclado móvel ativo.
4. Inspecionar contrastes, focus-visible, links LGPD, seleção de filtros, gráficos (inclusive visualização tabular), cores de alertas e todos os controles de autenticação.
5. Não fazer deploy de produção enquanto a cota da Vercel não for restaurada e a validação automática de dependências não for analisada.
