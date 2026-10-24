import { drizzle } from 'drizzle-orm/node-postgres';

import * as schema from './schema';

export function createDatabase(url: string) {
  return drizzle({ connection: url, casing: 'snake_case', schema });
}

export type Database = ReturnType<typeof createDatabase>;
