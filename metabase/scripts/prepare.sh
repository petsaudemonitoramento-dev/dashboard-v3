#!/usr/bin/env bash
# Preparacao idempotente no servidor MAE APS. NUNCA imprime segredos.
set -euo pipefail
umask 077
cd "$(dirname "$0")/.."

if ! command -v docker >/dev/null 2>&1 || ! docker compose version >/dev/null 2>&1; then
  echo "ERRO: Docker e Docker Compose v2 sao necessarios na maquina de destino." >&2
  exit 1
fi
if ! command -v openssl >/dev/null 2>&1; then
  echo "ERRO: OpenSSL nao esta instalado." >&2
  exit 1
fi

mkdir -p secrets backups
chmod 700 secrets backups

if [ ! -f secrets/app_db_password ]; then
  openssl rand -base64 48 > secrets/app_db_password
fi
chmod 600 secrets/app_db_password

if [ ! -f .env ]; then
  {
    printf 'MB_SITE_URL=http://localhost:3000\n'
    printf 'MB_ENCRYPTION_SECRET_KEY=%s\n' "$(openssl rand -base64 32)"
    printf 'MB_SESSION_SECRET_KEY=%s\n' "$(openssl rand -base64 32)"
  } > .env
fi
chmod 600 .env

if ! grep -q '^MB_ENCRYPTION_SECRET_KEY=.' .env || ! grep -q '^MB_SESSION_SECRET_KEY=.' .env; then
  echo "ERRO: .env presente mas nao tem as duas chaves configuradas. Nao foi alterado." >&2
  exit 1
fi

docker compose -f compose.yaml config --quiet
echo "Preflight OK. Credenciais preservadas; nenhuma chave foi mostrada."
echo "Proxima etapa: docker compose -f compose.yaml up -d"
