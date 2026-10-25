import type { BlobStore } from '@summarise/blob';
import type { Config } from '@summarise/config';
import type { RedisClient } from '@summarise/queue';
import type { SpeechToText } from '@summarise/speech-to-text';
import {
  createNoteRepository,
  createTranscriptSegmentRepository,
  type Database,
} from '@summarise/storage';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';

import { errorMiddleware } from './common/error.middleware';
import { authRoutes } from './modules/auth/auth.routes';
import { requireAuth } from './modules/auth/require-auth.middleware';
import { createTokens } from './modules/auth/utils/token.utils';
import { healthRoutes } from './modules/health/health.routes';
import { noteRoutes } from './modules/note/note.routes';
import { createNoteService } from './modules/note/note.service';
import { recordingRoutes } from './modules/recording/recording.routes';
import { createRecordingService } from './modules/recording/recording.service';
import { transcriptRoutes } from './modules/transcript/transcript.routes';
import { createTranscriptService } from './modules/transcript/transcript.service';

type AppDeps = {
  db: Database;
  redis: RedisClient;
  config: Config;
  // Tests pass a temp-folder store and a fake speech-to-text.
  blob: BlobStore;
  speechToText: SpeechToText;
};

export function createApp({ db, redis, config, blob, speechToText }: AppDeps) {
  const tokens = createTokens({
    accessSecret: config.JWT_ACCESS_SECRET,
    refreshSecret: config.JWT_REFRESH_SECRET,
  });
  const auth = requireAuth(tokens);

  const notes = createNoteRepository(db);
  const segments = createTranscriptSegmentRepository(db);
  const transcriptService = createTranscriptService({ notes, segments });
  const noteService = createNoteService({ notes, transcriptService });
  const recordingService = createRecordingService({
    noteService,
    transcriptService,
    blob,
    speechToText,
  });

  return (
    express()
      .use(helmet())
      // credentials: the web app on another port sends the auth cookies.
      .use(cors({ origin: config.WEB_ORIGIN, credentials: true }))
      .use(express.json())
      .use(cookieParser())
      .use('/health', healthRoutes(db, redis))
      .use('/auth', authRoutes(db, config, tokens))
      .use('/notes', noteRoutes(noteService, auth))
      .use('/notes/:noteId/chunks', recordingRoutes(recordingService, auth))
      .use(
        '/notes/:noteId/transcript',
        transcriptRoutes({ noteService, transcriptService }, auth),
      )
      // Last, so it catches errors from every route above.
      .use(errorMiddleware)
  );
}
