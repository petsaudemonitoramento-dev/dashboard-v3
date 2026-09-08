# Contrato de Implementação — Cuidado na Gestação na APS V3.0

> Este documento é normativo para a primeira implementação da V3. Não reinterpretar regras de domínio, segurança, ingestão ou analytics sem registrar explicitamente a necessidade de mudança.

## 1. Objetivo

Construir a V3 em ambiente totalmente separado da V2, preservando a produção atual. A V3 deve consolidar dois domínios independentes:

1. **Gestão Municipal**: analytics oficiais baseados em exportações SIAPS.
2. **Profissional**: diário clínico privado, opcional, com importação PEC.

Os dois domínios compartilham autenticação e infraestrutura, mas **não compartilham fatos clínicos para cálculo de indicadores oficiais**.

---

## 2. Perfis válidos

A V3 possui somente:

- `administrador`
- `gestao_municipal`
- `profissional`

Não criar ACS, aluno, gestão distrital ou `equipe_ubs` nesta versão.

### 2.1 Responsabilidades

**Administrador**
- gestão técnica de usuários;
- aprovação, bloqueio e alteração de perfil;
- importação/revisão/publicação da redistribuição territorial;
- manutenção da referência territorial;
- sem acesso automático a dados clínicos privados;
- sem privilégio implícito de superusuário de negócio.

**Gestão Municipal**
- importação de arquivos SIAPS;
- visualização do painel municipal e drill-down Distrito → UBS → Equipe;
- histórico de importações e validações;
- não altera território;
- não acessa diário clínico privado.

**Profissional**
- diário privado de próprias pacientes;
- importação PEC;
- consultas, exames, vacinas, risco e alertas próprios;
- não acessa SIAPS/analytics de gestão;
- não acessa dados de outro profissional, mesmo da mesma UBS.

---

## 3. Autenticação e autorização

Usar Supabase Auth com:

- e-mail + senha;
- Google OAuth;
- recuperação de senha;
- criação de conta;
- completar cadastro;
- aprovação administrativa antes de liberar acesso.

Fluxo esperado:

`cadastro → confirmação/OAuth → completar cadastro → aguardando aprovação → aprovado/rejeitado/bloqueado`.

### 3.1 Condição de usuário ativo

Uma sessão só é considerada autorizada se:

- `auth.getUser()` retornar usuário válido;
- perfil existir;
- perfil estiver ativo;
- cadastro estiver completo;
- aprovação estiver `aprovado`;
- não houver exclusão lógica/bloqueio.

### 3.2 Guards obrigatórios

Implementar equivalentes a:

- `getActiveProfileContext()`
- `requireAdministrator()`
- `requireMunicipalManagement()`
- `requireProfessional()`

A autorização não pode depender apenas do frontend. Toda API/Server Action privilegiada deve validar o perfil no servidor.

### 3.3 Cadastro público

O cadastro público não deve permitir autoatribuição de `administrador` ou `gestao_municipal`. Usuários entram sem privilégio e o Administrador define o papel aprovado. A primeira implementação pode limitar solicitação pública a profissional.

---

## 4. Segurança em profundidade

Proteger em quatro camadas:

1. UI/rotas;
2. API/Server Actions;
3. PostgreSQL/RLS;
4. Storage.

### 4.1 Segredos

Nunca expor no navegador ou versionar:

- service-role/secret key;
- database password;
- tokens administrativos;
- credenciais de integrações.

No cliente, usar somente URL pública + publishable key.

### 4.2 RLS

**`professional.*`**
- regra-base: `owner_user_id = auth.uid()`;
- profissional vê e altera apenas registros próprios;
- gestão não lê;
- administrador não lê por padrão.

**`siaps.*`**
- gestão opera ingestão por endpoints/funções controladas;
- profissional sem acesso;
- raw não deve ficar aberto para consulta indiscriminada.

**`analytics_gestao.*`**
- `gestao_municipal`: SELECT;
- profissional: sem acesso;
- administrador: sem acesso por padrão, salvo necessidade técnica explícita e minimizada;
- futuro `metabase_reader`: read-only.

**`core.*`**
- Administrador: CRUD controlado;
- Gestão: leitura necessária;
- Profissional: somente referências mínimas exigidas pelo módulo profissional.

### 4.3 Storage

Buckets privados sugeridos:

- `siaps-source`
- `territorio-source`
- `professional-source`

Arquivos do profissional devem ser segregados por `auth.uid()`.

### 4.4 Auditoria

Registrar ações privilegiadas, no mínimo:

- aprovação/bloqueio/alteração de perfil;
- importação de redistribuição;
- publicação de território;
- importação SIAPS;
- publicação/substituição de competência;
- alterações administrativas críticas.

Nunca registrar senha, token ou segredo em audit logs.

---

## 5. Organização lógica do banco

Schemas alvo:

- `core`
- `professional`
- `siaps`
- `analytics_gestao`
- `security`
- `audit`

Evitar concentrar tudo em `public`. O Data API pode permanecer habilitado, porém novas tabelas não devem ser automaticamente expostas e RLS deve ser habilitado desde a criação.

### 5.1 Entidades territoriais conceituais

- `core.distritos`
- `core.estabelecimentos`
- `core.equipes`
- `core.redistribuicoes`
- `core.redistribuicao_itens`
- `core.estabelecimento_distrito_vigencia`
- `core.estabelecimento_escopo`
- opcional: `core.equipe_estabelecimento_vigencia`

Preferir uma identidade por CNES para estabelecimento e uma identidade por INE para equipe.

Não permitir intervalos de vigência territorial ambíguos/sobrepostos para a mesma entidade.

---

## 6. Referência territorial

A redistribuição de Distritos e Equipes é a referência oficial de território.

### 6.1 Autoridade dos dados

**Redistribuição territorial**
- autoridade para `CNES → unidade → distrito → classificação territorial/escopo`.

**SIAPS**
- autoridade para indicador e componentes;
- autoridade observada para `INE → CNES` na competência, quando a referência territorial não trouxer INE.

### 6.2 Escopo analítico

- UBS: entra no painel quando classificada como elegível;
- Policlínica: reconhecida e excluída;
- Âncora: reconhecida e excluída;
- tipo desconhecido: não entra até revisão.

Aplicar estratégia de lista positiva: só entra aquilo explicitamente elegível como UBS.

### 6.3 Importação flexível de redistribuição

Aceitar conceitualmente PDF/XLSX/CSV, sem assumir layout fixo.

Pipeline:

`arquivo → preservação/hash → reconhecimento → normalização em draft → revisão administrativa → publicação → vigência`.

O sistema deve reconhecer conceitos, não posições físicas fixas de coluna.

Modelo canônico mínimo:

- CNES;
- nome da unidade;
- distrito;
- tipo de unidade;
- `inclui_painel`;
- observações;
- `valid_from`;
- `valid_to`.

Se o documento não trouxer INE, isso não é erro.

### 6.4 Validação SIAPS × território

1. CNES do SIAPS existe na referência vigente? Se não: divergência.
2. CNES existe, mas território/configuração diverge: divergência.
3. Unidade conhecida e marcada como policlínica/âncora: exclusão reconhecida, não divergência.
4. INE observado no SIAPS associado ao CNES: aceitar como identidade observada para a competência.
5. Mesmo INE mudar de CNES entre competências: sinal de descontinuidade, não erro automático.

Não usar nome da unidade como chave principal de validação.

### 6.5 UX de divergência

Mostrar exatamente:

- INE;
- nome da equipe;
- CNES;
- estabelecimento no SIAPS;
- valor encontrado;
- valor esperado;
- tipo de divergência.

Arquivo divergente pode ser recebido e preservado, mas publicação deve ficar bloqueada até correção/revalidação.

---

## 7. Ingestão SIAPS

Fonte oficial de gestão: **SIAPS — Relatório Qualidade — Visão por Competência**.

Na primeira versão, aceitar **XLSX somente**.

Não ingerir Visão por Equipe nem Visão por Indicador como fontes paralelas.

### 7.1 Escopo temporal

Série oficial V3 inicia em `JAN/2026`.

Dados anteriores não compõem a série oficial inicial. Se incorporados futuramente, devem ficar em séries históricas metodologicamente separadas.

### 7.2 Reconhecimento obrigatório

O parser deve validar que o arquivo representa realmente:

- SIAPS;
- Relatório Qualidade;
- Visão por Competência;
- indicador C3;
- município inicial Campina Grande-PB / IBGE 250400;
- competência válida;
- campos essenciais do relatório.

### 7.3 Modelo canônico SIAPS

Preservar, quando disponíveis:

- município;
- código IBGE;
- indicador;
- competência;
- data/hora de geração do relatório;
- preliminar/final;
- filtros de origem;
- CNES;
- nome do estabelecimento;
- tipo do estabelecimento;
- INE;
- nome da equipe;
- tipo da equipe;
- A...K;
- pontos total;
- denominador;
- resultado C3;
- filename;
- SHA-256;
- parser version;
- imported_at/by;
- status;
- supersedes_import_id;
- storage path;
- assinatura de escopo/filtros;
- validação.

### 7.4 Parsing estrito

Não converter silenciosamente valores inválidos em zero.

Regras:

- campo obrigatório ausente → erro;
- valor não numérico em A–K/pontos/denominador/resultado → erro;
- `parseInt('12abc')` não é aceitável;
- `null` não vira `0` por conveniência;
- denominador zero é semanticamente válido e significa `Sem população elegível`.

### 7.5 Arquivo original

Guardar XLSX original em Storage privado e registrar hash/metadata no banco.

Raw deve ser append-only/imutável.

---

## 8. C3 — regra analítica

Para cada linha/equipe:

`pontos = 10*A + 9*(B+C+D+E+F+G+H+I+J+K)`.

Resultado:

`C3 = pontos_total / denominador`.

Na agregação municipal, distrital ou por UBS:

`SUM(pontos_total) / SUM(denominador)`.

**Nunca calcular média simples dos percentuais das equipes.**

### 8.1 Classificação

- Ótimo: `> 75` e `<= 100`
- Bom: `> 50` e `<= 75`
- Suficiente: `> 25` e `<= 50`
- Regular: `<= 25`

Denominador zero: `Sem população elegível`, sem classificação negativa artificial.

### 8.2 Componentes A–K

A = 10 pontos.
B–K = 9 pontos cada.

A camada analítica deve permitir leitura dos componentes por município, distrito, UBS e equipe, respeitando denominadores semanticamente válidos.

---

## 9. Versionamento SIAPS

A mesma competência pode ser reexportada e corrigida pelo SIAPS.

Regra:

- mesma competência + município + indicador + filtros/escopo compatíveis;
- relatório com `generated_at` mais recente torna-se vigente;
- versão anterior permanece preservada/auditável;
- upload time não determina sozinho a versão mais nova.

### 9.1 Duplicado exato

Mesmo SHA-256: não criar nova versão. Retornar resultado amigável de arquivo já importado.

### 9.2 Escopo divergente

Filtros incompatíveis não podem sobrescrever silenciosamente versão anterior. Bloquear/revisar e mostrar diferença de filtros.

### 9.3 Publicação atômica

Pipeline conceitual:

`recebido → validado → candidato → publicação atômica → vigente`.

Nunca deixar fatos parcialmente atualizados ou mistura de versões antiga/nova.

---

## 10. Comparabilidade temporal

Estados/sinais possíveis:

- `CONTINUA`
- `INICIO_SERIE`
- `FIM_SERIE`
- `LACUNA_COMPETENCIA`
- `DESCONTINUIDADE_POPULACIONAL`
- `TRANSFERENCIA_TERRITORIAL`
- `QUEBRA_METODOLOGICA`
- `ESCOPO_DIVERGENTE`

Se houver quebra relevante, armazenar a variação bruta se necessário, porém `variacao_interpretavel` deve ficar nula.

A interface não deve mostrar seta verde/vermelha de melhora/piora em intervalos não comparáveis.

### 10.1 Mudança populacional

Usar mudança relativa de denominador como sinal configurável de possível descontinuidade. Um limiar inicial de 30% pode ser usado como warning, nunca como prova automática de transferência administrativa.

### 10.2 Gap

Competências não consecutivas não devem ser comparadas como evolução contínua.

### 10.3 Coorte fixa

Implementar análise de sensibilidade por coorte fixa no backend/analytics. Ela é auxiliar e não substitui o indicador oficial.

---

## 11. Golden set inicial

Arquivos reais de referência JAN–JUN/2026:

| Competência | Linhas brutas | Pontos | Denominador | C3 esperado | Filtro de origem |
|---|---:|---:|---:|---:|---|
| JAN/26 | 203 | 94.286 | 2.595 | 36,33 | eSF |
| FEV/26 | 203 | 92.054 | 2.540 | 36,24 | eSF |
| MAR/26 | 187 | 92.765 | 2.492 | 37,23 | eSF |
| ABR/26 | 153 | 90.885 | 2.423 | 37,51 | eSF |
| MAI/26 | 157 | 92.477 | 2.467 | 37,49 | eAP + eSF |
| JUN/26 | 156 | 89.979 | 2.443 | 36,83 | eAP + eSF |

O parser/analytics deve reproduzir esses resultados no conjunto de fixtures correspondente.

Testes obrigatórios:

- reconhecimento do relatório;
- extração de metadados;
- extração CNES/INE;
- A–K estritos;
- pontos;
- denominador;
- razão;
- duplicate SHA-256;
- layout inválido;
- campo obrigatório ausente;
- número inválido;
- denominador zero;
- filtros divergentes.

---

## 12. Módulo Profissional

O módulo Profissional é opcional e privado.

Conceitos principais:

- gestantes próprias;
- importação PEC;
- atendimentos;
- exames;
- vacinas;
- classificação de risco;
- alertas;
- mini-dashboard próprio.

Todo registro clínico deve possuir ownership explícito, preferencialmente `owner_user_id`.

A V3 pode reaproveitar conceitos e código robusto do importador PEC da V2, mas deve adaptar persistência e RLS ao novo modelo de ownership individual.

---

## 13. Camada analítica e Metabase

`analytics_gestao` deve conter apenas dados necessários à gestão, sem dados clínicos privados do módulo Profissional.

O futuro Metabase institucional UFCG deve usar usuário PostgreSQL dedicado, read-only, com acesso apenas a `analytics_gestao` e dimensões mínimas necessárias.

A aplicação Next.js continua sendo a interface operacional principal.

---

## 14. Frontend e identidade visual

Objetivo visual: plataforma institucional de saúde moderna, autoral, limpa e de alta qualidade, evitando aparência genérica de template/vibe coding.

### 14.1 Login

A tela de login aprovada usa:

- composição split-screen desktop;
- painel institucional azul-marinho/fotográfico à esquerda;
- PET Saúde + UFCG;
- título `Cuidado na Gestação na APS`;
- formulário branco sofisticado à direita;
- Google OAuth;
- e-mail/senha;
- lembrar de mim;
- recuperação;
- criação de conta;
- aviso de acesso autorizado;
- `Desenvolvido por Lucca Araújo`;
- `Versão 3.0 | Desing by: Kethilly Nayara`.

A fotografia hero deve ser um asset licenciado/permitido ou produzido especificamente para o projeto. Não embutir a interface inteira como imagem.

Composição recomendada:

`foto AVIF/WebP + overlay/gradientes CSS + linhas SVG/CSS + logos reais + texto HTML`.

No mobile, evitar baixar hero grande se ele não for exibido.

### 14.2 Dashboard Gestão

Prioridades visuais:

- C3 municipal;
- classificação;
- total de equipes elegíveis;
- denominador;
- tendência temporal;
- boas práticas mais frágeis;
- UBS/equipes que exigem atenção;
- filtros: competência, distrito, UBS, equipe, tipo;
- banner de competência/status SIAPS;
- drill-down sem excesso de abas.

---

## 15. Performance

- otimizar hero do login em AVIF/WebP;
- `next/image`/responsive sources quando adequado;
- não carregar imagem hero no mobile se desnecessária;
- lazy-load de módulos pesados;
- evitar hidratação global sem necessidade;
- processar XLSX server-side/worker quando necessário;
- limitar tamanho de upload;
- validar assinatura/MIME;
- evitar leitura integral desnecessária de arquivos grandes no cliente.

---

## 16. Stack técnica alvo

Manter compatibilidade com a linha tecnológica já validada na V2:

- Next.js 16.x;
- React 19.x;
- TypeScript 5.x;
- Tailwind 4.x quando útil;
- `@supabase/ssr`;
- `@supabase/supabase-js`;
- `postgres` server-side quando necessário;
- `xlsx`/SheetJS;
- `lucide-react`;
- Vitest;
- ESLint;
- Vercel.

Evitar adicionar dependência sem justificativa técnica clara.

---

## 17. Estratégia de implementação

### Fase 1 — Fundação
- scaffold Next.js/TypeScript;
- Supabase client/server;
- env validation;
- autenticação;
- perfis V3;
- banco/schema base;
- RLS;
- audit;
- testes de autorização.

### Fase 2 — Território
- modelo canônico;
- upload/reconhecimento/revisão/publicação;
- vigência;
- exclusão UBS/policlínica/âncora;
- divergências.

### Fase 3 — SIAPS/C3
- parser XLSX;
- raw/metadata/hash;
- versionamento;
- validação territorial;
- publicação atômica;
- golden tests.

### Fase 4 — Analytics e dashboard
- município/distrito/UBS/equipe;
- A–K;
- tendência;
- continuidade;
- coorte fixa;
- dashboard Gestão.

### Fase 5 — Profissional
- ownership;
- PEC;
- diário;
- mini-dashboard;
- isolamento clínico comprovado por RLS tests.

### Fase 6 — Produção
- CI;
- preview;
- security advisors;
- performance advisors;
- backup/recovery procedure;
- Vercel;
- documentação operacional.

---

## 18. Critério do primeiro marco funcional

A primeira prova de núcleo deve conseguir:

1. autenticar uma Gestão Municipal aprovada;
2. importar XLSX SIAPS JUN/2026;
3. reconhecer SIAPS/C3/Campina Grande/JUN-2026/filtros;
4. validar 156 linhas brutas do fixture;
5. extrair CNES, INE, A–K, pontos e denominador;
6. produzir `C3 = 36,83`;
7. cruzar com referência territorial disponível;
8. excluir unidades fora do escopo sem tratá-las como erro;
9. listar divergências nominais;
10. publicar somente após validação;
11. manter arquivo original, hash, auditoria e versão.

---

## 19. Proibições explícitas

Não:

- usar dados PEC para calcular C3 oficial;
- copiar RLS da V2 sem revisão;
- criar perfis legados;
- usar média simples de percentuais de equipes;
- assumir nomes como chave territorial;
- assumir que policlínica/âncora é erro;
- assumir que mudança grande no denominador prova piora/melhora;
- sobrescrever importação anterior se os filtros divergirem;
- apagar versões antigas do SIAPS;
- permitir service-role no browser;
- permitir acesso clínico de Administrador/Gestão ao módulo Profissional;
- acoplar parser a posição fixa de colunas quando o conceito puder ser reconhecido semanticamente;
- codificar quantidade fixa de equipes/UBS/distritos na interface.

---

## 20. Definição de pronto para o MVP

MVP somente pode ser considerado pronto se:

- autenticação e aprovação funcionarem;
- testes RLS demonstrarem isolamento real;
- importador SIAPS reproduzir golden set;
- território for versionado por vigência;
- divergências bloquearem publicação de forma explicável;
- versionamento SIAPS for auditável e atômico;
- dashboard usar agregação correta por pontos/denominador;
- descontinuidade impedir interpretação falsa de desempenho;
- Profissional e Gestão permanecerem separados;
- build/lint/tests passarem em CI;
- nenhuma chave secreta estiver versionada;
- security advisor do Supabase não apresentar vulnerabilidade crítica não tratada.
