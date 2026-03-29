#!/bin/bash
# Daily PostgreSQL backup — add to VPS crontab:
# 0 2 * * * /docker/propy/scripts/backup.sh

set -e

BACKUP_DIR="/docker/propy/backups"
DATE=$(date +%Y%m%d_%H%M%S)
KEEP_DAYS=14

mkdir -p "$BACKUP_DIR"

source /docker/propy/.env

docker compose -f /docker/propy/docker-compose.prod.yml exec -T db \
  pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > "$BACKUP_DIR/propy_$DATE.sql.gz"

# Remove backups older than KEEP_DAYS
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +$KEEP_DAYS -delete

echo "Backup complete: $BACKUP_DIR/propy_$DATE.sql.gz"
