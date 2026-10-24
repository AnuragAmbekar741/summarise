import { logger } from '@summarise/logger';
import { drizzle } from 'drizzle-orm/node-postgres';

import * as schema from './schema';

export function createDatabase(url: string) {
  const db = drizzle({ connection: url, casing: 'snake_case', schema });
  // Without a listener, a dropped idle connection crashes the process.
  // The pool opens a new connection on the next query.
  db.$client.on('error', (error) =>
    logger.error({ err: error }, 'postgres error'),
  );
  return db;
}

export type Database = ReturnType<typeof createDatabase>;
