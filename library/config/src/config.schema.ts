import { z } from 'zod';

// Every env key the backend reads. A key without a default must be set in .env.
export const ConfigSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  WEB_ORIGIN: z.url().default('http://localhost:5173'),
  DATABASE_URL: z.url(),
  REDIS_URL: z.url(),
  // Signs access tokens. Generate with `openssl rand -base64 32`.
  JWT_ACCESS_SECRET: z.string().min(32),
});

export type Config = z.infer<typeof ConfigSchema>;
