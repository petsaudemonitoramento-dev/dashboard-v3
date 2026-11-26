#!/usr/bin/env bash
# Validacao de ambiente para MAE APS + Metabase — sem criar usuarios ou exibir segredos.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "MAE APS / Metabase: checagem segura de infraestrutura"
if [[ "$(uname -s)" != "Linux" ]]; then
  echo "AVISO: destino recomendado e Linux; revisar compatibilidade." >&2
fi
for executable in docker python3 openssl curl; do
  command -v "$executable" >/dev/null || { echo "FALTA: $executable" >&2; exit 1; }
done
docker compose version >/dev/null
python3 scripts/provision.py --dry-run

if command -v free >/dev/null; then
  free -h | head -2
fi
if command -v df >/dev/null; then
  df -h . | tail -1
fi
if command -v nproc >/dev/null; then
  printf 'CPU virtual: %s\n' "$(nproc)"
fi

if [[ ! -f .env || ! -f secrets/app_db_password ]]; then
  echo "FALTA: secrets/app_db_password e/ou .env. Rodar bash scripts/prepare.sh no destino."
  exit 1
fi
docker compose -f compose.yaml config --quiet
echo "Compose principal: configuracao aceita."

if [[ "${1:-}" == "--https" ]]; then
  if ! grep -q '^METABASE_DOMAIN=.' .env; then
    echo "FALTA: METABASE_DOMAIN no .env (hostname DNS real sem https://)" >&2
    exit 1
  fi
  docker compose -f compose.yaml -f compose.https.yaml config --quiet
  echo "Compose HTTPS: configuracao aceita."
fi

if curl --fail --silent --show-error --max-time 8 http://127.0.0.1:3000/api/health >/dev/null; then
  echo "Metabase responde ao health check localhost."
else
  echo "Metabase ainda nao responde; iniciar Docker e consultar logs."
fi

if [[ -n "${METABASE_API_KEY:-}" ]]; then
  echo "API key em ambiente: conferindo metadata de dashboards sem mostrar credencial."
  METABASE_URL="http://127.0.0.1:3000" python3 scripts/verify_dashboard.py
else
  echo "Sem METABASE_API_KEY: validacao de 4 abas e 13 perguntas aguardara admin autorizado."
fi

echo "Checagem concluida. Publicacao depende ainda de DNS/TLS, papel leitor, permissao e navegador."
