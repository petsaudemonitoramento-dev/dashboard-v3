# Autenticação da V1

## Estado verificado no código

- Os clientes SSR e browser de `@supabase/ssr` usam PKCE. O callback troca o `code` por sessão no servidor e aceita somente destinos internos validados contra a origem canônica.
- Rotas internas validam claims no proxy e revalidam o usuário/perfil ativo no servidor. Autorização efetiva continua no servidor e na RLS.
- O JWT local dura 3.600 segundos. Isso é a validade do access token, não a duração absoluta da sessão.
- Rotação de refresh token está ativa, com janela de reutilização de 10 segundos no ambiente local.
- `signOut()` usa o escopo global padrão do Supabase: remove a sessão local e revoga refresh tokens do usuário. Access tokens já emitidos permanecem válidos até expirar; por isso o JWT curto e a checagem server-side continuam relevantes.
- Recuperação usa resposta genérica para não revelar se o e-mail existe, origem canônica fixa e callback PKCE.
- Troca segura de senha, confirmação de e-mail, cadastro anônimo desabilitado e comprimento mínimo de 8 caracteres constam na configuração local.
- A RPC administrativa impede desativar ou rebaixar o último administrador ativo e mantém o evento de auditoria somente para mudanças concluídas.

`supabase/config.toml` configura apenas o ambiente local. Ele não comprova o estado do projeto hospedado.

## Checklist obrigatório no Supabase Dashboard

Em **Authentication**, conferir no projeto de produção:

1. **URL Configuration**
   - Site URL: `https://maeaps.vercel.app`;
   - redirect permitido: `https://maeaps.vercel.app/auth/callback`;
   - cadastrar separadamente qualquer staging estável; não liberar curingas amplos de Preview.
2. **Sessions / JWT**
   - JWT expiry: 3.600 segundos;
   - refresh token rotation: ativa;
   - reuse interval: 10 segundos.
3. **E-mail e senha**
   - confirmação de e-mail ativa;
   - secure password change ativo;
   - anonymous sign-ins e manual linking desativados;
   - SMTP institucional configurado e testado;
   - limites de envio, login, refresh e verificação revisados para o volume esperado.
4. **Leaked Password Protection**
   - ativar a proteção contra senhas vazadas quando disponível no plano do projeto;
   - registrar evidência da tela/configuração no checklist de release;
   - se o plano não oferecer o recurso, registrar a limitação. Não há workaround local equivalente implementado.
5. **Google OAuth**
   - habilitar o provider Google somente após cadastrar Client ID e Client Secret no Supabase;
   - no Google Cloud, autorizar a callback do Supabase `https://nyexakdyxtstcyycmlng.supabase.co/auth/v1/callback`;
   - no Supabase, manter a callback final do app na allow-list indicada acima;
   - testar login novo, login existente, cancelamento e e-mail não autorizado em staging.

Segredos do Google, SMTP, chave secreta do Supabase e cookies de sessão nunca devem usar prefixo `NEXT_PUBLIC_` nem entrar no repositório.

## Duração absoluta da sessão

Nenhum `timebox` ou `inactivity_timeout` foi escolhido nesta etapa. Definir um número sem política de uso institucional poderia encerrar trabalho legítimo ou, no sentido oposto, manter sessões demais em computadores compartilhados.

Antes de ativar esses limites no Dashboard, a instituição deve decidir:

- se os equipamentos são pessoais ou compartilhados;
- duração máxima de turno e de uma importação/revisão;
- tolerância a reautenticação durante o expediente;
- procedimento de desligamento, troca de função e incidente;
- exigências formais de segurança da SMS/UFCG.

Depois da decisão, testar expiração absoluta, inatividade, refresh, recuperação e Google OAuth em staging. O valor aprovado deve ser documentado aqui e no registro de release.

## Smoke test de staging

- login por senha e redirecionamento por papel;
- refresh após mais de uma hora sem perder a rota;
- logout em uma sessão e verificação de revogação nas demais, pois o escopo atual é global;
- pedido e conclusão de recuperação de senha;
- Google OAuth/PKCE, inclusive cancelamento;
- usuário sem perfil, perfil inativo e tentativa sem permissão;
- cookies com `Secure`, `HttpOnly` e política `SameSite` esperada no HTTPS.

### Preview da Vercel

Para testes OAuth no Preview, `NEXT_PUBLIC_APP_URL` deve possuir um override específico para a branch `codex/hardening-v1-integrado`, apontando para a URL estável da branch na Vercel. A variável de Production permanece em `https://maeaps.vercel.app`. Após alterar uma variável de ambiente, é necessário gerar um novo deployment da branch para que o valor seja incorporado ao build.
