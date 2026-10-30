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
  // Sign access and refresh tokens. Generate each with
  // `openssl rand -base64 32`, using a different value for each.
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  // Neon Object Storage (S3-compatible). `neon deploy` / `neon env pull`
  // writes the AWS_* keys for the linked branch.
  AWS_ENDPOINT_URL_S3: z.url(),
  AWS_REGION: z.string().min(1),
  AWS_ACCESS_KEY_ID: z.string().min(1),
  AWS_SECRET_ACCESS_KEY: z.string().min(1),
  // The private bucket declared in neon.ts.
  UPLOADS_BUCKET: z.string().min(1).default('uploads'),
  // Speech-to-text. Get one at https://console.groq.com/keys.
  GROQ_API_KEY: z.string().min(1),
});

export type Config = z.infer<typeof ConfigSchema>;
