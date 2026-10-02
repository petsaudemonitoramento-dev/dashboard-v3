# Teste de carga básico com k6

O script `tests/load/mae-aps.js` mede três superfícies reais sem alterar dados:

- página pública de login;
- redirecionamento de uma rota protegida sem sessão;
- recusa da API de importação sem autenticação;
- opcionalmente, o dashboard autenticado quando um cookie temporário de staging é fornecido.

Os perfis disponíveis são 10, 50 e 100 usuários concorrentes. Eles duram, respectivamente, 1, 2 e 2 minutos, com uma pausa de um segundo por usuário virtual. Os thresholds de 95% dos checks e menos de 5% de falhas HTTP são guardas provisórias de sanidade, não SLOs institucionais. Latência p95 deve ser registrada como baseline antes de se definir um limite formal.

## Proteções

- Produção é bloqueada no código nesta etapa, inclusive o domínio oficial `maeaps.vercel.app` mesmo se for rotulado incorretamente como staging.
- Loopback é permitido por padrão.
- Um alvo remoto só é aceito como staging com `K6_ENVIRONMENT=staging` e a confirmação literal `K6_ALLOW_REMOTE=STAGING_AUTORIZADO`.
- A origem não pode conter credenciais, caminho, query ou fragmento.
- O script não publica planilhas nem executa mutations.

Não altere essas proteções para apontar à produção sem autorização institucional explícita, janela definida, monitoramento e plano de interrupção.

## Execução

O k6 não é dependência npm e não precisa ser instalado neste computador. Execute em uma máquina de teste ou runner autorizado que já possua o binário.

Exemplo local para o perfil de 10 usuários:

```powershell
$env:K6_BASE_URL = "http://127.0.0.1:3100"
$env:K6_PROFILE = "10"
npm run test:load
```

Exemplo de staging autorizado para 50 usuários:

```powershell
$env:K6_BASE_URL = "https://staging.exemplo.institucional"
$env:K6_ENVIRONMENT = "staging"
$env:K6_ALLOW_REMOTE = "STAGING_AUTORIZADO"
$env:K6_PROFILE = "50"
npm run test:load
```

Para incluir o dashboard, forneça `K6_AUTH_COOKIE` por um mecanismo secreto do runner. Nunca salve o cookie em arquivo, commit, saída de log ou variável pública. Use uma conta sintética de Gestão em staging e gere a sessão imediatamente antes do teste para evitar refresh durante a carga.

Registre por perfil:

- `http_req_duration` p50, p90 e p95;
- `http_req_failed`;
- taxa de checks;
- iterações por segundo;
- consumo e erros observados no Vercel e no Supabase de staging.


## Teste cloud real somente leitura

Para validar o banco hospedado sem criar projeto/branch paga, existe também:

```powershell
npm run test:load:cloud
```

Esse cenário é deliberadamente mais restrito que o teste de staging:

- trava o destino para o projeto Supabase `dashboard-v3` (`nyexakdyxtstcyycmlng.supabase.co`);
- aceita somente os perfis de 10 VUs por 1 minuto e 50 VUs por 2 minutos;
- autentica uma única conta sintética de Gestão no `setup()`;
- executa apenas leituras das views analíticas C3;
- não publica XLSX, não altera perfis, não altera território e não executa mutations;
- exige a confirmação literal `K6_ALLOW_CLOUD=READ_ONLY_AUTHORIZED`;
- senha e chave publicável ficam apenas em variáveis de ambiente locais e nunca devem ser commitadas.

Variáveis exigidas:

```text
K6_SUPABASE_URL
K6_SUPABASE_ANON_KEY
K6_TEST_EMAIL
K6_TEST_PASSWORD
K6_PROFILE=10 ou 50
K6_ALLOW_CLOUD=READ_ONLY_AUTHORIZED
```

Use somente uma conta sintética de Gestão. Comece pelo perfil 10 e só avance para
50 se a taxa de erro permanecer normal. Esse teste consome a franquia normal do
projeto hospedado, portanto não deve ser repetido sem necessidade nem ampliado
para cargas maiores enquanto o projeto estiver no plano gratuito.

Durante a execução, registrar:

- `http_req_duration` p50, p90 e p95;
- `http_req_failed`;
- taxa de `checks`;
- iterações por segundo;
- contadores do Postgres antes/depois;
- erros nos logs do Supabase;
- qualquer sinal de throttling ou resposta 5xx.
