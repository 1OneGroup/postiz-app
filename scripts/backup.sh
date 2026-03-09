#!/bin/bash
set -euo pipefail

# Postiz VPS Backup Script
# Backs up both PostgreSQL databases + uploads volume
# Run via cron: 0 3 * * * /home/postiz/app/scripts/backup.sh >> /home/postiz/app/backups/backup.log 2>&1

APP_DIR="/home/postiz/app"
BACKUP_DIR="$APP_DIR/backups"
RETENTION_DAYS=14
DATE=$(date +%Y-%m-%d_%H%M)

mkdir -p "$BACKUP_DIR"

echo "=== Backup started: $DATE ==="

# Backup app PostgreSQL
echo "Backing up postiz-postgres..."
docker exec postiz-postgres pg_dump -U postiz-user postiz-db-local | gzip > "$BACKUP_DIR/postiz-db_${DATE}.sql.gz"
echo "  -> postiz-db_${DATE}.sql.gz ($(du -h "$BACKUP_DIR/postiz-db_${DATE}.sql.gz" | cut -f1))"

# Backup Temporal PostgreSQL
echo "Backing up temporal-postgresql..."
docker exec temporal-postgresql pg_dumpall -U temporal | gzip > "$BACKUP_DIR/temporal-db_${DATE}.sql.gz"
echo "  -> temporal-db_${DATE}.sql.gz ($(du -h "$BACKUP_DIR/temporal-db_${DATE}.sql.gz" | cut -f1))"

# Backup uploads volume
echo "Backing up uploads volume..."
docker run --rm -v postiz-uploads:/data -v "$BACKUP_DIR":/backup alpine \
    tar czf "/backup/uploads_${DATE}.tar.gz" -C /data .
echo "  -> uploads_${DATE}.tar.gz ($(du -h "$BACKUP_DIR/uploads_${DATE}.tar.gz" | cut -f1))"

# Cleanup old backups
echo "Removing backups older than ${RETENTION_DAYS} days..."
find "$BACKUP_DIR" -name "*.gz" -mtime +$RETENTION_DAYS -delete -print

echo "=== Backup complete ==="
ls -lh "$BACKUP_DIR"/*.gz 2>/dev/null | tail -10
