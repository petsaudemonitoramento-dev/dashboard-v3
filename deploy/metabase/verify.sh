#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

if [[ ! -f .env ]]; then
  echo "Arquivo .env ausente; nao iniciado." >&2
  exit 1
fi
docker compose --env-file .env -f compose.yaml config --quiet
docker compose --env-file .env -f compose.yaml ps

port="$(grep '^METABASE_PORT=' .env | cut -d= -f2)"
port="${port:-3000}"
if command -v curl >/dev/null 2>&1; then
  curl --fail --silent --show-error "http://127.0.0.1:${port}/api/health"
  printf '\n'
else
  echo "curl nao disponivel; cheque o status do servico acima."
fi
