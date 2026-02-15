#!/bin/sh
set -e

echo "Waiting for database to be ready..."
MAX_RETRIES=30
RETRY=0
until node --input-type=module -e "
import postgres from 'postgres';
const sql = postgres(process.env.DATABASE_URL);
try { await sql\`SELECT 1\`; await sql.end(); process.exit(0); } catch { process.exit(1); }
" 2>/dev/null; do
  RETRY=$((RETRY + 1))
  if [ "$RETRY" -ge "$MAX_RETRIES" ]; then
    echo "Database not ready after $MAX_RETRIES retries, continuing anyway..."
    break
  fi
  echo "Database not ready, retrying ($RETRY/$MAX_RETRIES)..."
  sleep 2
done

echo "Pushing database schema..."
npx drizzle-kit push --force 2>&1 || echo "Schema push failed, continuing..."

echo "Running database seed..."
node dist/db/seed.js 2>&1 || echo "Seed skipped or failed"

echo "Starting application..."
exec "$@"
