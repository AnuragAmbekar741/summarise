import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { z } from 'zod';

import { ConfigSchema } from './config.schema';

// .env lives at the repo root, three levels up from this file.
const ENV_FILE = fileURLToPath(new URL('../../../.env', import.meta.url));
if (existsSync(ENV_FILE)) process.loadEnvFile(ENV_FILE);

const result = ConfigSchema.safeParse(process.env);
if (!result.success) {
  throw new Error(`Invalid environment:\n${z.prettifyError(result.error)}`);
}

export const config = result.data;
export type { Config } from './config.schema';
