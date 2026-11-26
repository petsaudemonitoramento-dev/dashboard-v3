# MAE APS — alertas analiticos sem licença paga

O Metabase OSS permite alertas para perguntas e assinaturas de dashboards.
As funcionalidades sao nativas; a entrega exige **canal de notificacao
configurado**, como SMTP da instituicao, Slack ou webhook autorizado.
Nao usar contas pessoais ou servicos externos para enviar informacoes de saude
sem governanca e revisao da LGPD.

## Alerta inicial ja preparado

Pergunta `distritos_quedas_persistentes` em `questions.json`:
- Retorna apenas os distritos identificados com **duas quedas consecutivas**
  do C3 em competencias mensais consecutivas.
- Quando nenhum distrito satisfaz a condicao, retorna **zero linhas**.
- Uma pergunta que retorna zero linhas serve de base para o gatilho
  `When a question returns a result` (quando a pergunta retornar resultados).
- O conteudo e agregado e inclui o nome do distrito e os C3 dos tres meses.
  Nao ha nomes de pacientes, CPF ou atendimentos individuais.
- Uma queda observada nao implica causalidade ou falha profissional;
  ela sugere revisao e acompanhamento da gestao.

## Ativacao apos instalar o Metabase

1. Responsavel autorizado configura o canal SMTP/Slack/webhook em
   Admin → Settings, confirmando politica de destinatarios, criptografia,
   dominio permitido e minimizacao.
2. Abrir a pergunta salva `Acompanhamento — distritos com quedas persistentes`
   dentro do Metabase administrativo.
3. Criar o alerta `When a question returns a result` e revisar a periodicidade
   (recomendacao: mensal, apos a publicacao do SIAPS; nao disparar a cada minuto).
4. Enviar um teste **somente** para endereco aprovado e revisar se os dados
   nao expõem pequenas contagens ou identificadores sensiveis.
5. Registrar responsavel por cancelar, alterar destinatarios e responder ao alerta.

Os gestores continuam acessando exclusivamente o MAE APS. A notificacao
adicional e opcional e separada da incorporacao visual.
Nao declarar notificacoes automaticas ativas ate o envio de teste ser concluido.

Fontes:
- https://www.metabase.com/docs/latest/questions/alerts
- https://www.metabase.com/docs/latest/dashboards/subscriptions
