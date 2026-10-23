#!/bin/sh
# Backup do Postgres do poc-control: dump via pg_dump dentro do container `db`
# (usa POSTGRES_USER/POSTGRES_DB que o docker-compose já injeta no container,
# evitando precisar reler o .env aqui) e grava comprimido em backups/,
# fora do controle de versão. Mantém só os últimos RETENCAO_DIAS dias.

set -eu

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BACKUP_DIR="$PROJECT_DIR/backups"
RETENCAO_DIAS=14

mkdir -p "$BACKUP_DIR"
cd "$PROJECT_DIR"

ARQUIVO="$BACKUP_DIR/poc-control-$(date +%Y%m%d-%H%M%S).sql.gz"

docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' | gzip > "$ARQUIVO"

echo "Backup salvo em $ARQUIVO ($(du -h "$ARQUIVO" | cut -f1))"

find "$BACKUP_DIR" -name 'poc-control-*.sql.gz' -mtime +"$RETENCAO_DIAS" -delete
