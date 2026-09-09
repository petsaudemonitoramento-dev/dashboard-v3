#!/usr/bin/env bash
# Invólucro para gerar-pacote-registro.py. Existe para que o pacote seja
# produzido com um comando só, em Linux, macOS, WSL ou Git Bash.
set -euo pipefail
raiz="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if ! command -v python3 >/dev/null 2>&1; then
  echo "ERRO: python3 não encontrado. É a única dependência do gerador." >&2
  exit 1
fi

exec python3 "$raiz/scripts/gerar-pacote-registro.py" "$@"
