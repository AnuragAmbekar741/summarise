import { config } from '@summarise/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema',
  out: './migrations',
  casing: 'snake_case',
  dbCredentials: { url: config.DATABASE_URL },
});
