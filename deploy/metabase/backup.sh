#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
umask 077

if [[ ! -f .env ]]; then
  echo "Erro: deploy/metabase/.env nao existe; inicialize primeiro." >&2
  exit 1
fi
if ! docker compose version >/dev/null 2>&1; then
  echo "Erro: Docker Compose nao encontrado." >&2
  exit 1
fi
backup_dir="${METABASE_BACKUP_DIR:-$HOME/mae-aps-metabase-backups}"
mkdir -p "$backup_dir"
chmod 700 "$backup_dir"
backup_file="$backup_dir/metabaseappdb-$(date -u +%Y%m%dT%H%M%SZ).dump"
tmp_file="$backup_file.tmp"
trap 'rm -f "$tmp_file"' EXIT

docker compose --env-file .env -f compose.yaml exec -T app-db \
  pg_dump --format=custom --username=metabase --dbname=metabaseappdb > "$tmp_file"
chmod 600 "$tmp_file"
mv "$tmp_file" "$backup_file"
trap - EXIT
echo "Backup gerado em: $backup_file"
echo "Copia criptografada fora da maquina e teste de restauracao ainda sao necessarios."
