# Smoke test da V1

Este checklist valida o Release Candidate sem substituir Vitest, pgTAP,
Playwright/axe, CodeQL ou o build do CI. Registre evidências sem copiar
cookies, tokens, chaves, payloads SIAPS, e-mails reais ou dados pessoais.

## Registro da execução

- Ambiente: `Preview` / `Staging` / `Produção`
- URL:
- Commit/deployment:
- Data e horário:
- Responsável:
- Navegador e versão:
- Resultado: `APROVADO` / `REPROVADO`
- Evidências controladas:
- Incidentes/observações:

## Pré-condições e segurança

- [ ] Os checks **Validar aplicacao, migrations e RLS** e **Analisar
      JavaScript e TypeScript** estão verdes para o mesmo commit.
- [ ] O deployment testado corresponde exatamente ao commit registrado acima.
- [ ] Preview/Staging usa contas sintéticas separadas para `gestao`, `leitura`
      e `admin`, sem reutilizar credenciais reais.
- [ ] Qualquer mutação usa somente registros sintéticos identificáveis e um
      banco de Preview/Staging autorizado.
- [ ] A URL foi conferida antes de qualquer mutação; nunca executar as etapas
      mutáveis em `https://maeaps.vercel.app`.
- [ ] DevTools está configurado para não persistir/exportar corpos sensíveis.
- [ ] Se houver erro 5xx, quebra de autorização, exposição de segredo/PII,
      perda de dados ou divergência de migration, interromper o smoke e não
      promover/mesclar o deployment.

## Preview ou Staging

### Autenticação e autorização

- [ ] Abrir `/entrar`; formulário, identidade visual e foco inicial carregam
      sem erro no console.
- [ ] Entrar com `gestao` ativa; abrir Dashboard e Importar dados.
- [ ] Entrar com `leitura` ativa; abrir Dashboard e confirmar ausência de
      acesso à importação.
- [ ] Entrar com `admin` ativo; abrir Território e Administração e confirmar
      que o Dashboard permanece fora do escopo desse papel.
- [ ] Com cada papel, tentar ao menos uma rota não permitida e confirmar
      bloqueio/redirect sem revelar detalhes internos.
- [ ] Fazer logout e confirmar que uma rota protegida volta ao login.
- [ ] Solicitar recuperação de senha para conta sintética e validar o fluxo
      completo em caixa de teste, inclusive PKCE/callback e expiração do link.

### Dashboard, filtros e análises

- [ ] Confirmar carregamento da visão geral, KPIs, gráficos e alternativas
      tabulares sem erro de rede.
- [ ] Alterar Distrito e confirmar limpeza de UBS e Equipe.
- [ ] Confirmar que as UBS oferecidas pertencem ao Distrito selecionado.
- [ ] Alterar UBS e confirmar limpeza de Equipe.
- [ ] Confirmar que as equipes oferecidas pertencem à UBS selecionada.
- [ ] Selecionar `Não informado` e confirmar somente UBS/fatos realmente sem
      distrito, sem mistura com unidades distritalizadas.
- [ ] Manipular a URL com Distrito/UBS/Equipe incompatíveis e confirmar
      normalização/redirect server-side sem ampliação do recorte.
- [ ] Buscar um CNES válido e um INE válido; confirmar o recorte esperado.
- [ ] Informar CNES/INE inexistente e confirmar resultado vazio ou filtro
      normalizado, nunca retorno municipal ampliado.
- [ ] Abrir Indicadores e conferir A–K, denominadores e razão das somas.
- [ ] Abrir Comparativos, selecionar duas UBS e conferir os rótulos CNES.
- [ ] Abrir UBS e equipes, filtrar/buscar e abrir uma análise detalhada.
- [ ] Conferir que Gestão e Leitura mantêm visão municipal; não existe
      coordenador distrital nem recorte territorial por usuário.

### Administração e Território

- [ ] Com `admin`, navegar entre duas páginas da Administração e confirmar
      paginação real, total e máximo de 50 usuários por página.
- [ ] Confirmar que somente os perfis da página corrente são apresentados.
- [ ] Em fixture isolada, tentar desativar o último administrador ativo e
      confirmar rejeição clara.
- [ ] Em fixture isolada, tentar rebaixar o último administrador ativo e
      confirmar rejeição clara.
- [ ] Com dois admins sintéticos ativos, alterar um perfil de teste e confirmar
      persistência e evento de auditoria sem IP, User-Agent ou sessão.
- [ ] Em UBS sintética, abrir o diálogo de Território, conferir foco/Escape e
      registrar uma nova vigência válida.
- [ ] Confirmar histórico territorial, ausência de sobreposição e auditoria.
- [ ] Não alterar UBS, território ou perfis reais durante este smoke.

### Importação SIAPS

- [ ] Selecionar XLSX sintético válido e conferir competência, SHA-256,
      ocorrências, contagem e pré-visualização antes de publicar.
- [ ] Publicar o XLSX sintético autorizado e confirmar resultado atômico,
      histórico, dashboard e evento `siaps_c3_import_published`.
- [ ] Repetir o mesmo arquivo e confirmar bloqueio por duplicidade.
- [ ] Tentar arquivo não XLSX e confirmar mensagem amigável.
- [ ] Tentar XLSX sintético inválido (CNES/INE/A–K/denominador) e confirmar
      rejeição antes de qualquer publicação.
- [ ] Confirmar que erro de validação não mostra stack, SQL, chave ou conteúdo
      interno e não envia nome/linhas do XLSX ao Sentry.

### Segurança, observabilidade e rede

- [ ] Conferir `Content-Security-Policy` com `frame-ancestors 'none'`,
      `object-src 'none'`, `base-uri` e `form-action`.
- [ ] Conferir HSTS, `X-Content-Type-Options`, `X-Frame-Options`,
      `Referrer-Policy` e `Permissions-Policy`.
- [ ] Confirmar que Auth Supabase, callback Google/PKCE, ECharts e Sentry não
      são bloqueados pela CSP incremental.
- [ ] Revisar console e Network: nenhum 5xx inesperado, segredo, service role,
      payload SIAPS, cookie ou token em URL/resposta/log.
- [ ] Gerar exceção sintética controlada em Preview/Staging e confirmar evento
      no Sentry sem usuário/e-mail, cookies, Authorization/JWT, chaves, query
      sensível, nome XLSX, linhas/payload SIAPS, IP, User-Agent ou sessão.
- [ ] Confirmar Session Replay, profiling e tracing desnecessário desativados.

### Acessibilidade e apresentação

- [ ] Usar somente teclado: skip-link, menus, filtros, formulário de
      importação, paginação e logout são alcançáveis e operáveis.
- [ ] Confirmar foco visível e preservado após filtros; diálogo contém o foco e
      fecha com Escape retornando ao acionador.
- [ ] Confirmar labels, cabeçalhos/captions, mensagens `aria-live` e
      alternativas tabulares dos gráficos.
- [ ] Testar zoom de 200% sem perda de conteúdo ou sobreposição bloqueante.
- [ ] Validar responsividade básica em larguras aproximadas de 360 px, 768 px
      e desktop.
- [ ] Ativar `prefers-reduced-motion` e confirmar ausência de animação
      essencial/incontrolável.
- [ ] Fazer revisão manual de contraste dos textos pequenos; axe não comprova
      conformidade WCAG completa.

## Produção após merge — somente não destrutivo

Execute apenas depois dos checks verdes no commit de `main`, migrations
controladas e promoção do deployment correto.

- [ ] Confirmar URL oficial e SHA/deployment promovido.
- [ ] Fazer login com contas institucionais autorizadas dos três papéis, sem
      alterar cadastro.
- [ ] Confirmar bloqueio de uma rota sem permissão para cada papel relevante.
- [ ] Abrir o Dashboard, gráficos e alternativas tabulares.
- [ ] Exercitar apenas filtros de leitura: período, Distrito, UBS, Equipe,
      `Não informado`, CNES/INE e classificação.
- [ ] Fazer logout e confirmar proteção das rotas.
- [ ] Conferir headers HTTP no domínio oficial.
- [ ] Conferir logs e saúde do deployment/Supabase sem consultar payloads
      sensíveis.
- [ ] Confirmar recebimento e sanitização do Sentry a partir das evidências de
      Preview/Staging; não provocar exceção sintética em produção.
- [ ] **Não importar arquivo de teste em produção.**
- [ ] **Não alterar território em produção durante o smoke.**
- [ ] **Não alterar perfil real em produção durante o smoke.**

## Encerramento

- [ ] Todos os itens aplicáveis têm evidência e responsável.
- [ ] Falhas foram registradas e corrigidas na mesma branch, sem contornar
      testes ou alertas reais.
- [ ] O resultado e o commit aprovado foram anexados ao processo de release.
- [ ] Nenhuma tag foi criada antes da aprovação final do freeze.
