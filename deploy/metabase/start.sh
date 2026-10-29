#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

if ! command -v docker >/dev/null 2>&1 || ! docker compose version >/dev/null 2>&1; then
  echo "Erro: Docker Engine + plugin Docker Compose nao encontrados no servidor." >&2
  exit 1
fi
if [[ ! -f .env ]]; then
  echo "Gerando configuracao de primeira instalacao..."
  bash ./bootstrap.sh
fi
if [[ "$(stat -c %a .env)" != 600 ]]; then
  chmod 600 .env
fi

docker compose --env-file .env -f compose.yaml config --quiet
docker compose --env-file .env -f compose.yaml up -d
docker compose --env-file .env -f compose.yaml ps

echo "Apenas o localhost da maquina escuta a porta Metabase."
echo "Conecte-se usando tunel SSH ou publicacao HTTPS privada/autenticada."
echo "A configuracao inicial e os paineis devem ser finalizados na interface do Metabase."
