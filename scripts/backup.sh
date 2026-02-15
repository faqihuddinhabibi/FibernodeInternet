#!/bin/sh
set -e

BACKUP_DIR="/backups"
RETENTION_DAYS=30

while true; do
  TIMESTAMP=$(date +%Y%m%d_%H%M%S)
  FILENAME="fibernode_${TIMESTAMP}.sql.gz"

  echo "Creating backup: ${FILENAME}"
  pg_dump | gzip > "${BACKUP_DIR}/${FILENAME}"

  echo "Cleaning old backups (older than ${RETENTION_DAYS} days)..."
  find "${BACKUP_DIR}" -name "fibernode_*.sql.gz" -mtime +${RETENTION_DAYS} -delete

  echo "Backup completed: ${FILENAME}"
  echo "Next backup in 24 hours..."
  sleep 86400
done
