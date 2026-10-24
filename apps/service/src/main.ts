import { config } from '@summarise/config';
import { createRedisClient } from '@summarise/queue';
import { createDatabase } from '@summarise/storage';

import { createApp } from './app';

const db = createDatabase(config.DATABASE_URL);
const redis = await createRedisClient(config.REDIS_URL);

const app = createApp({ db, redis, webOrigin: config.WEB_ORIGIN });

app.listen(config.PORT, () => {
  console.log(`service listening on http://localhost:${config.PORT}`);
});
