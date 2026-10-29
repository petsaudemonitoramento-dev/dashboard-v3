# MAE APS · Inteligencia em Saude com Metabase Open Source

**Objetivo:** gestores veem apenas o MAE APS. Metabase OSS funciona nos bastidores,
consulta as views agregadas de C3 do Supabase e fornece 4 abas de analise embutidas
por JWT assinado pelo servidor. Sem licencas Metabase e sem instalar nada no PC pessoal.

**Importante:** este kit e pre-instalacao, NAO e uma instancia de producao.
Um servidor 24h com acesso a rede e HTTPS sera indispensavel para executar
e validar o aplicativo. A configuracao administrativa inicial deve ser
feita pelo responsavel autorizado no navegador.

## O que ja foi construido e testado na nuvem

- 14 consultas analiticas reais (variacao de C3, quedas consecutivas, ranking de
  variacoes, cobertura por pratica e qualidade dos dados) organizadas em 4 abas;
- SQL testado com EXPLAIN e SELECT agregado no projeto Supabase MAE APS;
- script de provisionamento sem bibliotecas externas, repetivel e que nao apaga
  dashboard existente; testes de manifesto/layout e instalacao simulada;
- PostgreSQL interno persistente, Metabase OSS fixado na versao `v0.64.4.1`,
  scripts de preflight e backup e opcao de proxy HTTPS gratuito Caddy;
- pagina /sistema/gestao/inteligencia no MAE APS, apenas para perfis gestao/leitura
  com sessao valida; segredo JWT exclusivamente no servidor, feature flag desligada;
- validacoes GitHub Actions geram artefato ZIP sem credenciais.

Documentos: [Design e metodologia](DESIGN.md) ·
[Guest embedding gratuito](EMBED_MAE_APS.md) ·
[SQL versionado](questions.json).

## Como funciona

```
Gestor / Leitura -> login MAE APS (Supabase Auth)
    -> pagina Análises avançadas (MAE APS / Vercel)
    -> POST autenticado /api/metabase/guest-token (JWT 5 min)
    -> Metabase OSS em HTTPS via guest embed
    -> queries SELECT -> analytics.dashboard_* no Supabase dashboard-v3

Maquina da professora (Linux 24h):
  Docker Metabase + PostgreSQL privativo para metadados e configuracoes.
```

O Metabase **nao armazena gestantes nem importa CSV**. O banco `metabaseappdb`
guarda apenas o estado do Metabase (contas, perguntas, dashboards e configuracoes).
Nao usar conexao `postgres` privilegiada para dados de gestacao;
a role tecnica `mae_metabase_reader` tem acesso restrito e fica `NOLOGIN`
ate ser autorizada para a conexao real.

## Requisitos a verificar quando a professora ceder a maquina

1. Linux (CPU x86_64 ou ARM64), Docker Engine e Compose v2, acesso SSH e
   permissao para rodar containers; memoria/disco suficientes para Metabase
   (Java) e PostgreSQL, sem assumir capacidade da maquina.
2. Rede de saida para PostgreSQL do Supabase MAE APS com conexao TLS validada.
3. Acesso de navegadores a um hostname HTTPS real para o Metabase.
   **O tunel SSH localhost so serve para configuracao do administrador**,
   nao para o embed nos navegadores dos gestores.
4. Se houver DNS publico e portas externas 80/443 liberadas, usar overlay
   gratuito de Caddy; caso contrario, a equipe de TI deve providenciar
   rota HTTPS segura equivalente, sem presumir uma oferta gratis universal.
5. Plano de persistencia e backup cifrado fora da maquina, responsabilidade
   pela manutencao e controles de acesso acordados com a gestao.

## Execucao minima quando houver acesso SSH

### Etapa 1 — copiar o pacote e iniciar localmente

Clonar o commit aprovado no servidor, entrar em `metabase/` e executar:

```bash
bash scripts/prepare.sh
bash scripts/check-server.sh
docker compose -f compose.yaml up -d
docker compose -f compose.yaml ps
curl -fsS http://127.0.0.1:3000/api/health
```

`prepare.sh` gera segredos criptograficos localmente com `umask 077`.
Nao imprimir, enviar no chat, guardar em GitHub nem recriar as chaves ao atualizar.
O painel permanece ligado apenas ao `127.0.0.1:3000` nesse momento.

### Etapa 2 — opcional: HTTPS automatico com Caddy gratuito

**Somente se ja existir DNS de hostname valido apontando para a maquina, portas
80 e 443 liberadas e autorizacao da equipe responsavel.**

Atualizar manualmente na `.env` local, sem segredos no Git:

```dotenv
METABASE_DOMAIN=bi.DOMINIO-REAL-APROVADO
MB_SITE_URL=https://bi.DOMINIO-REAL-APROVADO
```

Depois:

```bash
bash scripts/check-server.sh --https
docker compose -f compose.yaml -f compose.https.yaml up -d
```

O Caddy emite e renova o TLS automaticamente com ACME/Let's Encrypt quando
os pre-requisitos de dominio/portas sao atendidos. O Compose simples (sem overlay)
**nao abre** 80/443 nem publica PostgreSQL. Se a rede exigir proxy existente,
nao executar a sobreposicao Caddy; usar a rota HTTPS aprovada pela TI.

### Etapa 3 — configurar a aplicacao **pelo navegador**, como administrador autorizado

1. Abrir UI pela conexao local autorizada/tunel SSH.
2. Criar pessoalmente o administrador, com senha exclusiva e segura.
3. Habilitar LOGIN da role `mae_metabase_reader` no projeto
   Supabase oficial (em sessao privilegiada autorizada), com senha
   gerada/guardada fora do Git; nao autorizar acesso de dados brutos.
4. **Admin → Databases → Add Database → PostgreSQL**:
   - nome da fonte: `MAE APS - SIAPS C3`;
   - host/porta oficiais do projeto `dashboard-v3`, conforme conexao
     direta/pooler suportada pela rede da maquina;
   - database `postgres`, usuario `mae_metabase_reader`, TLS com
     verificacao de certificado;
   - ocultar fontes nao pertinentes e validar permissoes e leituras.
5. Criar API key de administracao no Metabase por acesso seguro e disponibilizar
   somente na sessao de terminal para a instalacao das perguntas.

### Etapa 4 — carregar e verificar os 14 cards / 4 abas

```bash
python3 scripts/provision.py --dry-run
# Com METABASE_API_KEY ja injetada no ambiente pelo operador:
python3 scripts/provision.py --apply
python3 scripts/verify_dashboard.py
bash scripts/backup.sh
```

O script NAO cria/edita usuarios, nao define senha da fonte, nao publica guest
embed, nao ativa frontend e NAO apaga layout anterior. Confirmar manualmente
numeros C3 com MAE APS; competencia sem dados, denominador zero e equipes
sem distrito. Configurar exibicao visual no Metabase (4 abas) e ajustar
filtros analiticos apenas apos validar o SQL.

### Etapa 5 — conectar ao MAE APS, sem segundo login

Na UI Metabase, abrir o dashboard, ativar **Guest Embedding** e publicar
**somente o embed JWT**; nao habilitar links publicos sem assinatura.
Guardar segredo de assinatura do Metabase em gerenciador seguro.

No ambiente da Vercel MAE APS, lado **somente do servidor**, configurar:

```dotenv
METABASE_GUEST_EMBED_ENABLED=true
METABASE_PUBLIC_URL=https://bi.DOMINIO-REAL-APROVADO
METABASE_DASHBOARD_ID=NUMERO-APURADO-EM-verify_dashboard.py
METABASE_GUEST_SECRET_KEY=SEGREDO-DE-EMBED-INSERIDO-COM-SEGURANCA
```

Nao usar `NEXT_PUBLIC_` nessas chaves; nao ativar flag antes de HTTPS,
conta Metabase, fonte, queries e acessos estarem verificados.
O gestor entra somente no MAE APS. O banner *Powered by Metabase*
sera mantido no OSS. Downloads agregados de questoes podem ser permitidos
no plano gratis: consultar apenas dados agregados sem informacoes pessoais.

## Checklist final de aceite

- [ ] Docker/Compose e PostgreSQL interno persistente com backup externo testado
- [ ] Dominio HTTPS valido e browser iPad/desktop consegue abrir o guest embed
- [ ] Conexao SSL restrita com `mae_metabase_reader`, sem tabelas sensiveis
- [ ] Quatro abas / quatorze consultas presentes, com `verify_dashboard.py` OK
- [ ] SQL conferido com recortes reais de competencia, distrito e UBS
- [ ] Regra de classificacao nao inventada; variacao em pontos percentuais
- [ ] Compartilhamento publico desabilitado; painel Guest JWT publicado
- [ ] Perfil gestor/leitura autorizado, admin/anonimo nao recebe JWT
- [ ] CI do MAE APS passou sem eliminar bloqueios de auditoria
- [ ] Backup, restauracao e rotina de atualizacoes revisados
- [ ] Ativar feature flag MAE APS somente depois do aceite tecnico

## Fontes oficiais

- https://www.metabase.com/docs/latest/installation-and-operation/running-metabase-on-docker
- https://www.metabase.com/docs/latest/embedding/guest-embedding
- https://www.metabase.com/docs/latest/installation-and-operation/security-best-practices-self-hosting
- https://caddyserver.com/docs/automatic-https
