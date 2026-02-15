import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { db } from './index.js';
import { logger } from '../utils/logger.js';

async function runMigrations() {
  logger.info('Running database migrations...');
  try {
    await migrate(db, { migrationsFolder: './drizzle' });
    logger.info('Migrations completed successfully');
  } catch (error) {
    logger.error({ error }, 'Migration failed');
    process.exit(1);
  }
}

runMigrations();
