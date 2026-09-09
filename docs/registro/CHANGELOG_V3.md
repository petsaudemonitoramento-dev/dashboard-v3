# Changelog — Versão 3.0

## Por que uma reescrita

A V3 não continua a base de código anterior. As razões são estruturais, não de
gosto:

1. **O cálculo do indicador estava no lugar errado.** Recompor o C3 na camada de
   apresentação significa que cada consumidor novo — um relatório, uma
   exportação, uma ferramenta de BI — reimplementa a regra e, mais cedo ou mais
   tarde, produz um número diferente para a mesma pergunta.
2. **A recomposição por média simples é incorreta.** O C3 é uma razão. A média
   dos percentuais das equipes não é o percentual do conjunto. No dado real de
   Campina Grande o erro chega a 3,49 pontos no nível da unidade — o suficiente
   para mudar a faixa de classificação de uma unidade.
3. **O modelo de perfis acumulava papéis sem uso.** ACS, aluno, equipe UBS e
   gestão distrital existiam no modelo sem função definida, ampliando a
   superfície de autorização sem contrapartida. A V3 reconhece **três** perfis, e
   recusa explicitamente os legados — há teste para cada um.
4. **O dado clínico não estava isolado do dado de gestão** com garantia de
   banco. Separação por convenção é separação que se perde na próxima rota.

A V3 não compartilha banco, esquema de autorização nem base de código com as
versões anteriores. Nenhum dado, credencial ou migração é reaproveitado.

---

## 3.0 — 2026-09-09

### Fundação e autorização

- Seis schemas com isolamento por concessão: `core`, `professional`, `siaps`,
  `analytics_gestao`, `security`, `audit`.
- Três perfis — Administrador, Gestão Municipal, Profissional. Papéis legados
  recusados.
- Ciclo de vida do acesso completo: cadastro público sempre nasce Profissional
  pendente; aprovação, rejeição, ativação, inativação, bloqueio, desbloqueio e
  redefinição de papel são ações administrativas distintas e auditadas.
- `security.is_active_role` como predicado único de papel ativo.
- RLS em todas as tabelas de dado; `security_invoker` em todas as *views*;
  `search_path` vazio em todas as funções `security definer`.
- Trilha de auditoria ilegível pela aplicação.
- Buckets de origem privados, com caminho por `auth.uid()` no módulo
  Profissional.

### Correções de segurança (auditoria da Fase 1)

- **C1** — Envenenamento do link de recuperação de senha por `X-Forwarded-Host`.
  `NEXT_PUBLIC_APP_URL` passou a ser obrigatória e é a **única** origem dos links
  de autenticação; nenhum cabeçalho participa.
- **A1** — Redirecionamento aberto no retorno da autenticação. `safeNext` resolve
  o destino contra a origem canônica; `/\evil.com` e formas equivalentes são
  recusadas.
- **A2** — Reautenticação exigida na troca de senha passou a ser reconhecida
  explicitamente, sem exigir a senha atual na recuperação.
- **A3** — Mensagens de erro deixaram de expor detalhe do provedor.
- **M1** — `complete_profile` deixou de permitir que perfil bloqueado ou
  rejeitado reescrevesse os próprios dados.
- **M2** — O último administrador ativo não pode mais ser removido; a invariante
  é verificada após a mutação, sob trava de aplicação.
- **B1** — O redirecionamento de negativa passou a negar por padrão diante de um
  código desconhecido.

Dívida aceita conscientemente registrada em `../SECURITY_DEBT.md`.

### Administração

- Área administrativa funcional, com ações granulares por situação do perfil.
- `security.admin_apply_profile_action` com trava de aplicação, recusa de
  auto-revogação e invariante do último administrador.

### Módulo Profissional

- Módulo privado completo: pacientes, importações, atendimentos, exames,
  vacinas e avaliações de risco, todos isolados por proprietário.
- Importação da planilha do PEC, transacional, com reconhecimento tolerante de
  cabeçalho e validação estrita de valores.
- Desduplicação por nome normalizado e data de nascimento; sem data de
  nascimento, não deduplica e avisa.
- **Nenhuma coluna de CPF ou CNS**, por decisão de projeto.
- *Views* de visão geral e de alertas, respeitando o RLS.

### Módulo Gestão e motor do indicador

- Território mínimo com **vigência temporal**: o vínculo equipe → unidade →
  distrito é resolvido na competência, não no estado atual.
- INE e CNES tratados como texto, preservando zeros à esquerda.
- Ingestão do relatório *Qualidade — Visão por Competência* como **fonte única**;
  as demais visões são recusadas.
- Reconhecimento obrigatório da fonte: título, indicador, município e competência
  mínima.
- Base bruta **imutável** — gatilhos bloqueiam alteração e remoção.
- Identidade do arquivo pelo resumo SHA-256 do conteúdo, não pelo nome.
- Substituição decidida pelo `generated_at` do SIAPS, não pelo horário do envio.
- Divergência de recorte detectada por assinatura de escopo normalizada e
  bloqueia a substituição.
- Importar e publicar como passos separados.
- Conferência do arquivo contra a fórmula oficial `10×A + 9×(B..K)` em cada
  linha.
- Motor do C3 no banco, com recomposição aditiva
  `SOMA(pontos) / SOMA(denominador)` em Município, Distrito, Unidade e Equipe,
  mais a leitura por boa prática.
- Denominador zero devolve nulo e é apresentado como *"Sem população elegível"*,
  nunca como *Regular*.
- Faixas oficiais de classificação, com teste em cada fronteira.
- **Exclusão de policlínicas por lista positiva no banco**, com motivo
  registrado e informado no painel — não como filtro visual.
- CNES desconhecido fica pendente de revisão, em vez de ser adivinhado.

### Verificação

- 202 asserções automatizadas: 110 em TypeScript, 92 em SQL.
- Testes SQL com troca real de papel; o RLS é exercido, não simulado.
- O motor do C3 é testado contra valores reais publicados pelo SIAPS.
- A cadeia de oito migrations foi verificada aplicando-se limpa, na ordem, sobre
  um banco vazio.
- `npm audit`: 0 vulnerabilidades. Supabase Security Advisor: 0 ERROR.

Evidências completas em `../VERIFICACAO_V3.md`.

### Defeito encontrado e corrigido durante o desenvolvimento

A bateria de banco encontrou uma falta real de concessão: `authenticated` não
tinha `usage` no schema `siaps` e, por isso, não conseguiria sequer chamar as
funções de ingestão. O defeito foi corrigido antes do commit correspondente. É
mencionado aqui porque é o tipo de erro que só aparece quando os testes trocam
de papel de verdade.
