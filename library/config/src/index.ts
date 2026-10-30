import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { z } from 'zod';

import { ConfigSchema } from './config.schema';

// The repo root, three levels up from this file. .env lives here.
const REPO_ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const ENV_FILE = resolve(REPO_ROOT, '.env');
if (existsSync(ENV_FILE)) process.loadEnvFile(ENV_FILE);

const result = ConfigSchema.safeParse(process.env);
if (!result.success) {
  throw new Error(`Invalid environment:\n${z.prettifyError(result.error)}`);
}

export const config = result.data;
export type { Config } from './config.schema';
