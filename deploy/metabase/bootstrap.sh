#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
umask 077

if [[ -e .env ]]; then
  echo "Arquivo .env ja existe; preservado. Nao sobrescrevemos chaves ou senhas."
  exit 0
fi
if ! command -v openssl >/dev/null 2>&1; then
  echo "Erro: openssl nao encontrado. Instale o pacote openssl antes de continuar." >&2
  exit 1
fi

db_password="$(openssl rand -hex 32)"
encryption_key="$(openssl rand -base64 32 | tr -d '\n')"
session_key="$(openssl rand -base64 32 | tr -d '\n')"

cat > .env <<EOF
METABASE_PORT=3000
METABASE_APP_DB_PASSWORD=${db_password}
MB_ENCRYPTION_SECRET_KEY=${encryption_key}
MB_SESSION_SECRET_KEY=${session_key}
EOF

chmod 600 .env
unset db_password encryption_key session_key
echo "Configuracao local gerada em deploy/metabase/.env (permissoes 600)."
echo "IMPORTANTE: guarde as chaves de criptografia e sessao em cofre fora desta maquina."
echo "Nao coloque o .env no GitHub nem envie seu conteudo por chat."
