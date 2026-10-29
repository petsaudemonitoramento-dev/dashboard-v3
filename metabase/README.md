# Metabase MAE APS — pacote para a maquina 24h (Linux + Docker Compose)

Este diretório prepara uma instancia **Metabase OSS self-hosted** exclusiva do MAE APS.
Todo o desenvolvimento, revisao e teste de arquivos pode ser feito pelo **GitHub no navegador do iPad**;
nao requer instalar Metabase, Docker ou PostgreSQL no computador pessoal.

## Arquitetura

```
iPad (navegador/SSH autorizado)
        |
   VPN ou tunel SSH (preferencia inicial)
        |
maquina 24h: Metabase v0.64.4.1 — 127.0.0.1:3000
        |                         |
        | leitura SSL             +-- Postgres privado (metabaseappdb)
        |                                  guarda dashboards, perguntas e usuarios
        v
Supabase dashboard-v3 (projeto MAE APS)
        |
    mae_metabase_reader (login restrito, SELECT somente nas views C3 e suportes)
```

**Dois bancos distintos**: `metabaseappdb` interno salva as configuracoes do Metabase, enquanto o Supabase oficial guarda os indicadores C3. O PostgreSQL interno nunca recebe copia das gestantes ou dos arquivos do SIAPS.

## Requisitos de destino (a confirmar com a professora)

- Maquina Linux x86_64/arm64 ligada 24 h com Docker Engine e plugin Docker Compose v2;
- Permissao para executar Docker e acesso a armazenamento persistente, backup, DNS/firewall e rede de saida HTTPS/TCP para Supabase;
- Memoria e disco adequados ao Metabase Java + Postgres: dimensionar com os recursos reais da maquina; a implantacao **nao deve assumir que qualquer VM e suficiente**;
- Acesso por SSH, VPN ou proxy HTTPS protegido, sem publicar diretamente as portas de Metabase/Postgres;
- Acesso administrativo ao Metabase para setup no **navegador**, e banco de dados Postgres do Supabase com role tecnica exclusiva ativada por administrador.

Nao configurar token, senha ou chave no chat. Criar esses valores somente na VM/cofre de segredos.

## Preparacao na maquina Linux (quando receber acesso)

Clone a branch aprovada do repositorio no servidor, entre na pasta `metabase/` e execute:

```bash
bash scripts/prepare.sh
docker compose -f compose.yaml up -d
docker compose -f compose.yaml ps
curl -fsS http://127.0.0.1:3000/api/health
```

A primeira inicializacao pode exigir alguns minutos. O script gera **uma unica vez**:
`secrets/app_db_password`, `.env` com `MB_ENCRYPTION_SECRET_KEY` e `MB_SESSION_SECRET_KEY`.
Se ja existirem, preserva ambos. Nunca executar limpeza de volumes como procedimento de atualizacao.

A porta 3000 esta ligada somente ao `127.0.0.1` do servidor; de fora, usar tunel SSH e navegar em
`http://localhost:3000` **atraves do tunel** (ou proxy HTTPS protegido). Isso funciona com iPad usando
um cliente SSH que aceite encaminhamento de porta e um navegador; o computador pessoal nao precisa ficar ligado.

**A primeira conta administradora deve ser criada pela propria pessoa autorizada no navegador.**
Nao automatizar inicializacao de usuario nem transmitir sua senha pelo chat.

## Conectar Supabase ao Metabase (uma unica vez)

Na instancia: **Admin → Databases → Add database → PostgreSQL**.
Nome da conexao: `MAE APS - SIAPS C3`.
Selecionar exclusivamente o projeto **dashboard-v3**, host e porta oficiais do Supabase, database `postgres`,
usuario `mae_metabase_reader`, SSL com verificacao de certificado. O host exato depende do modo de conexao
direta/pooler e da conectividade da VM.

A role foi criada com `NOLOGIN` por seguranca, portanto **nao conecta ate que um administrador habilite login
e defina a senha pelo seu canal seguro**. Nao utilizar usuario `postgres`, senha mestra, service_role ou chave
secret do Supabase. Sincronizar `analytics`, ocultar tabelas de apoio e desabilitar compartilhamento publico.

## Provisionar o painel de BI (10 perguntas, 3 abas)

O layout e versionado em [questions.json](questions.json) com grid nativo de 24 colunas:

| Aba | Visualizacoes |
| --- | --- |
| **Panorama municipal** | C3 atual, total de UBS, total de equipes, equipes sem distrito, evolucao C3, classificacao das equipes |
| **Distritos e UBS** | Evolucao distrital, comparativo de UBS, tabela de equipes para acompanhamento |
| **Praticas A–K** | Indicadores por pratica |

A paleta de referencia (`#0a3570`, `#0c7ce9`, `#16b8b1`) segue o MAE APS, mas **o Metabase OSS nao permite white-label completo**. Titulos, graficos e abas sao nativos; a tipografia, o cabecalho e as cores da interface padrao do Metabase podem ser diferentes do prototipo visual externo.

Depois que a pessoa autorizada criar o primeiro usuario na UI e cadastrar a fonte `MAE APS - SIAPS C3`, executar no servidor:

```bash
python3 scripts/provision.py --dry-run
# Injetar METABASE_API_KEY apenas no ambiente seguro da propria maquina.
python3 scripts/provision.py --apply
```

O script Python usa somente biblioteca padrao, consulta uma fonte ja cadastrada e instala a colecao, as 10 perguntas, os 3 tabs e as posicoes. **Se o dashboard ja tiver cards/abas, nao os substitui ou apaga**. A chave da API nao deve aparecer no chat, CI, GitHub ou historico de comandos.

Os filtros de competencia e distrito (incluindo ligacao entre perguntas SQL e parametros do Metabase) dependem de validacao na UI da instancia real. **O prototipo HTML usa filtros ficticios; nao prova que os filtros nativos ja estejam ligados.** Ver [plano visual](DESIGN.md) e [catalogo SQL](../docs/METABASE_PERGUNTAS.md).

## Backup, atualizacao e seguranca

```bash
bash scripts/backup.sh
docker compose -f compose.yaml logs --tail 80 metabase
```

O backup inclui apenas os **metadados do Metabase**. Guardar backup cifrado **fora da maquina** e manter
`MB_ENCRYPTION_SECRET_KEY` em cofre, separadamente do dump. Restauracao deve ser testada antes do uso definitivo.
Para atualizar, primeiro fazer backup, revisar o changelog e **alterar explicitamente a tag**
`metabase/metabase:v0.64.4.1` na PR; nunca atualizar automaticamente para `latest`.

Para publicar fora do tunel SSH, adicionar proxy reverso HTTPS (certificado valido), firewall/restricoes
de origem, autenticao administrativa robusta e `MB_SITE_URL=https://...`. Jamais abrir o PostgreSQL interno.
Na configuracao Metabase: revisar `All Users`, restringir edicao e SQL nativo por grupo, desligar links publicos,
habilitar somente os acessos de gestao autorizados.

## O que AINDA depende da maquina real

- Verificar RAM, armazenamento, SO, arquitetura, politica de TI, saida para Supabase e tunel/proxy;
- Subir containers e inicializar usuario administrador pelo navegador;
- Ativar login/senha da role tecnica em canal seguro;
- Conectar a fonte de dados, rodar `provision.py --apply`, validar os indicadores por competencia e territorio;
- Decidir se e como incorporar o Metabase dentro do MAE APS (sem embedding publico ou acesso anonimo);
- Configurar backup externo e atualizacoes da maquina.

Nao declaramos Metabase "em producao" antes de essas etapas terminarem.

## Documentacao

- https://www.metabase.com/docs/latest/installation-and-operation/running-metabase-on-docker
- https://www.metabase.com/docs/latest/installation-and-operation/configuring-application-database
- https://www.metabase.com/docs/latest/installation-and-operation/security-best-practices-self-hosting
- https://www.metabase.com/docs/latest/people-and-groups/api-keys
