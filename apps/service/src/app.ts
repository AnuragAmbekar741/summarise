import type { Config } from '@summarise/config';
import type { RedisClient } from '@summarise/queue';
import type { Database } from '@summarise/storage';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';

import { errorMiddleware } from './common/error.middleware';
import { authRoutes } from './modules/auth/auth.routes';
import { healthRoutes } from './modules/health/health.routes';

type AppDeps = { db: Database; redis: RedisClient; config: Config };

export function createApp({ db, redis, config }: AppDeps) {
  return (
    express()
      .use(helmet())
      // credentials: the web app on another port sends the auth cookies.
      .use(cors({ origin: config.WEB_ORIGIN, credentials: true }))
      .use(express.json())
      .use(cookieParser())
      .use('/health', healthRoutes(db, redis))
      .use('/auth', authRoutes(db, config))
      // Last, so it catches errors from every route above.
      .use(errorMiddleware)
  );
}
