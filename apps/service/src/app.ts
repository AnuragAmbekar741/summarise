import type { RedisClient } from '@summarise/queue';
import type { Database } from '@summarise/storage';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';

import { healthRoutes } from './modules/health/health.routes';

type AppDeps = { db: Database; redis: RedisClient; webOrigin: string };

export function createApp({ db, redis, webOrigin }: AppDeps) {
  return express()
    .use(helmet())
    .use(cors({ origin: webOrigin }))
    .use(express.json())
    .use('/health', healthRoutes(db, redis));
}
