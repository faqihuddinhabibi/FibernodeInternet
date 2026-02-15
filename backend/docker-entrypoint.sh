#!/bin/sh
set -e

echo "Running database migrations..."
node dist/db/migrate.js || echo "Migration skipped or failed"

echo "Running database seed..."
node dist/db/seed.js || echo "Seed skipped or failed"

echo "Starting application..."
exec "$@"
