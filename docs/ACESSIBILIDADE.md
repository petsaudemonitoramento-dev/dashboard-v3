# Acessibilidade da V1

O MAE APS inclui uma auditoria automatizada com `@axe-core/playwright` nas telas de autenticação, dashboards de Gestão e Leitura, importação, Administração, Território e diálogo territorial. Os cenários usam as regras WCAG 2.0, 2.1 e 2.2 de níveis A e AA que o axe consegue verificar automaticamente.

Também há verificações de teclado para o link de salto, menu do usuário, permanência do foco nos filtros, alternativa tabular dos gráficos e contenção/fechamento do diálogo territorial.

## Execução

- `npm run test:e2e:list`: coleta os cenários localmente sem Docker e sem instalar navegador.
- `npm run test:e2e`: suíte completa destinada ao runner isolado do GitHub Actions, que sobe o Supabase local e instala o Chromium.

O computador de desenvolvimento não precisa de Docker nem do binário do Chromium. Em falhas no CI, traces, screenshots e relatório do Playwright ficam disponíveis no artefato `playwright-diagnostics` por sete dias.

## Limites da evidência

A automação não comprova conformidade WCAG completa. Contraste, zoom, ordem de leitura, mensagens dinâmicas e jornadas críticas ainda devem receber revisão manual antes da tag V1. O teste automatizado funciona como proteção contra regressões detectáveis, não como certificação.

Checklist manual mínimo:

- percorrer cada fluxo somente com `Tab`, `Shift+Tab`, `Enter`, `Espaço` e `Escape`;
- testar zoom em 200% e reflow em largura equivalente a 320 CSS px;
- conferir nomes e sequência de leitura com leitor de tela;
- verificar contraste de estados de foco, erro, desabilitado e hover;
- confirmar que gráficos continuam compreensíveis pela tabela de dados.
