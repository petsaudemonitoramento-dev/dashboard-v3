# MAE APS — pacote portátil do Metabase

Este diretório deixa o Metabase OSS pronto para ser **hospedado futuramente em uma máquina Linux ligada 24h**, sem instalar nada no iPad ou no computador pessoal do projeto. O deploy é **independente da Vercel** do MAE APS. Nenhum aplicativo profissional (Gestário APS) é afetado.

## Arquitetura

```text
iPad / navegador de gestao
         |
  tunel SSH (ou HTTPS com autenticacao)
         |
Maquina 24h Linux + Docker Compose
   ├── Metabase OSS (acesso 127.0.0.1:3000)
   └── PostgreSQL interno (application DB; guarda paineis, usuarios e configuracoes)
              |
Metabase le views agregadas no Supabase oficial MAE APS
dashboard-v3 / schema analytics / mae_metabase_reader (somente leitura)
```

O PostgreSQL **interno** e para a aplicacao Metabase; o Supabase permanece fonte exclusiva dos indicadores oficiais do MAE APS. Nao duplicar dados individuais, prontuarios ou o banco operacional.

## O que ja pode ser feito integralmente na nuvem

- Manter Docker Compose, scripts e consultas no GitHub e revisar pelo Safari no iPad.
- CI valida a estrutura YAML, sintaxe dos scripts e que as portas NAO sao publicas.
- Indicadores (views existentes), SQL das perguntas e RLS ficam versionados na PR.
- O GitHub Actions gera um arquivo ZIP sem credenciais com o kit de instalacao.

**Limitacao real:** Metabase OSS nao inclui exportacao/importacao por serialization (recurso de Pro/Enterprise). As perguntas do arquivo [METABASE_PERGUNTAS.md](../../docs/METABASE_PERGUNTAS.md) estao prontas em SQL, mas ainda devem ser salvas no Metabase apos sua configuracao inicial. Nao existe dashboard real publicado antecipadamente.

## Requisitos da maquina cedida

- Acesso autorizado via SSH e permissao de executar Docker Engine e Docker Compose.
- Linux, rede para baixar imagens Docker e acesso de saida ao PostgreSQL Supabase (via pooler com SSL, conforme as opcoes disponiveis).
- Recomendacao de partida para hospedagem conjunta Metabase + PostgreSQL: **2 vCPU, 4 GB RAM ou mais**, preferencialmente 8 GB com margem e armazenamento persistente. Ajustar conforme usuarios simultaneos e limites reais da maquina.
- Backup criptografado externo ao servidor; autorizacao de quem administra a maquina para servico continuo e atualizacoes.

**Nao exponha a porta 3000 ou 5432 diretamente na internet.** O Compose ja faz bind de Metabase somente em `127.0.0.1`, e o PostgreSQL nao publica porta. Para acesso remoto, use tunel SSH a partir de cliente compativel no iPad ou VPN privada/Tailscale; para acesso por usuarios finais, configurar endereco HTTPS + autenticacao e firewall, com aprovacao da pessoa responsavel pela maquina.

## Instalacao na maquina (apos liberar acesso)

No terminal SSH da propria maquina:

```bash
git clone https://github.com/petsaudemonitoramento-dev/dashboard-v3.git
cd dashboard-v3/deploy/metabase
bash ./bootstrap.sh
bash ./start.sh
bash ./verify.sh
```

Enquanto a PR nao estiver em `main`, usar a branch aprovada em vez de clonar `main`. Sem git, o ZIP da Action `MAE APS - Pacote Metabase` contem este mesmo diretório.

O `bootstrap.sh` gera automaticamente **tres segredos aleatorios** em `.env` com permissao 600. Nao cola nenhuma senha no repositorio, no chat ou em logs. Guarde `MB_ENCRYPTION_SECRET_KEY` e `MB_SESSION_SECRET_KEY` com seguranca fora da maquina. A perda da chave de criptografia impede a recuperacao das credenciais criptografadas no banco Metabase.

Verifique a saude em `http://127.0.0.1:3000/api/health` **dentro da maquina**; a pagina inicial pode ser acessada de um dispositivo remoto atraves de tunel SSH ou acesso privado adequado. A criacao do primeiro administrador e feita manualmente na interface do Metabase.

## Configurar a fonte Supabase (somente apos primeira inicializacao)

1. Confirmar que a role `mae_metabase_reader` existe no banco `nyexakdyxtstcyycmlng` e revisar privilegios/RLS.
2. Gerar senha forte em um gerenciador de segredos ou no ambiente seguro da maquina e habilitar `LOGIN` nessa role (atualmente e **NOLOGIN** por seguranca). Nao usar o usuario `postgres` nem credenciais administrativas em Metabase.
3. No painel Supabase do MAE APS, confirmar host, porta, banco e SSL em **Connect → Session pooler**. Usar preferencialmente TLS com validacao do certificado. O pooler pode exigir formato de nome do usuario diferente da conexao direta; conferir no painel antes de tentar.
4. Em Metabase, `Admin → Databases → Add a database → PostgreSQL`, cadastrar usando a credencial dedicada de leitura.
5. Limitar sincronizacao do Metabase ao schema `analytics` e trabalhar com as sete views `dashboard_*`; ocultar as tabelas-base da exploracao visual.
6. Criar as seis perguntas em [METABASE_PERGUNTAS.md](../../docs/METABASE_PERGUNTAS.md) e verificar os totais C3 por mes, distrito e UBS contra o MAE APS.
7. Proteger usuarios e grupos dentro do Metabase; desabilitar **public sharing**. Um eventual painel embutido no MAE APS so deve ser implementado depois de testar autorizacao de `gestao`/`leitura` e assinatura JWT do lado do servidor, com parametros bloqueados e sem segredo no navegador.

**O Metabase nao deve ser publicado diretamente no ambiente Vercel/Next.js** como um processo Java persistente. Aqui o aplicativo continua na Vercel e o BI roda na maquina 24h.

## Operacao e backup

```bash
# Exibir saude
bash ./verify.sh

# Backup do banco de configuracao de paineis/usuarios
bash ./backup.sh

# Ver logs sem segredos
docker compose -f compose.yaml --env-file .env logs --tail=100 metabase

# Parar sem destruir os volumes
docker compose -f compose.yaml --env-file .env stop
```

Os backups sao gravados, por padrao, fora do repositorio, em `~/mae-aps-metabase-backups`, com permissoes 600. Depois e preciso **copiar o backup criptografado para outro local** e testar restauracao controlada em outro ambiente. O arquivo inclui configuracoes sensiveis de acesso, e o banco de aplicacao e as chaves devem ser tratados como confidenciais. Nao executar `docker compose down -v`.

## Antes de disponibilizar a equipe

- Confirmar SO, RAM, CPU, espaco de disco, administrador autorizado e politica de backup.
- Definir acesso privativo seguro (tunel/VPN) ou proxy HTTPS autenticado; bloquear portas nao necessarias.
- Executar checklist de testes de seguranca (sem acesso a `app`, `auth`, `audit`, `siaps`, `study` e `public`).
- Conferir a versao da imagem Metabase e atualizacoes de seguranca antes de instalar; a imagem foi fixada para tornar testes/reproducoes deterministicas.
- Nao colocar dados de pacientes ou senhas em capturas de tela do iPad, repositorio, CI ou conversas.
