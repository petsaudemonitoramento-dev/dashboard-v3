#!/usr/bin/env bash
# Backup apenas do banco INTERNO do Metabase (paineis, contas e perguntas).
# O banco SIAPS no Supabase NAO e copiado por este comando.
set -euo pipefail
umask 077
cd "$(dirname "$0")/.."
mkdir -p backups
chmod 700 backups
dest="backups/metabaseappdb-$(date -u +%Y%m%dT%H%M%SZ).dump"
tmp="${dest}.tmp"
trap 'rm -f "$tmp"' EXIT
docker compose -f compose.yaml exec -T metabase-db sh -c \
  'PGPASSWORD="$(cat /run/secrets/app_db_password)" exec pg_dump -Fc -U metabaseapp -d metabaseappdb' > "$tmp"
test -s "$tmp"
mv "$tmp" "$dest"
chmod 600 "$dest"
trap - EXIT
echo "Backup criado: $dest (guardar copia cifrada fora da VM)"
