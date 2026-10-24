import { config } from '@summarise/config';
import { pino } from 'pino';

const isDevelopment = config.NODE_ENV === 'development';

// JSON lines in production, coloured readable lines in development.
export const logger = pino({
  level: isDevelopment ? 'debug' : 'info',
  transport: isDevelopment ? { target: 'pino-pretty' } : undefined,
});

export type { Logger } from 'pino';
