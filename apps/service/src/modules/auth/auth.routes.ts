import type { Config } from '@summarise/config';
import { LoginSchema, SignupSchema } from '@summarise/contract';
import { createUserRepository, type Database } from '@summarise/storage';
import { Router } from 'express';

import { validateBody } from '../../common/validate.middleware';
import { createAuthController } from './auth.controller';
import { createAuthService } from './auth.service';
import { requireAuth } from './require-auth.middleware';
import { createTokens } from './token.utils';

export function authRoutes(db: Database, config: Config) {
  const tokens = createTokens({ accessSecret: config.JWT_ACCESS_SECRET });
  const controller = createAuthController({
    authService: createAuthService(createUserRepository(db)),
    tokens,
    secureCookies: config.NODE_ENV === 'production',
  });

  return Router()
    .post('/signup', validateBody(SignupSchema), controller.signup)
    .post('/login', validateBody(LoginSchema), controller.login)
    .post('/logout', controller.logout)
    .get('/me', requireAuth(tokens), controller.me);
}
