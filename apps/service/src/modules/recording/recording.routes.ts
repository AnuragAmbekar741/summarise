import { NoteParamsSchema, UploadChunkSchema } from '@summarise/contract';
import { Router, type RequestHandler } from 'express';

import { validateBody, validateParams } from '../../common/validate.middleware';
import { createRecordingController } from './recording.controller';
import type { RecordingService } from './recording.service';
import { uploadAudio } from './utils/upload.middleware';

// Mounted at /notes/:noteId/chunks.
export function recordingRoutes(
  recordingService: RecordingService,
  requireAuth: RequestHandler,
) {
  const controller = createRecordingController(recordingService);

  return Router({ mergeParams: true }).post(
    '/',
    requireAuth,
    validateParams(NoteParamsSchema),
    // Fills req.file and the text fields in req.body.
    uploadAudio,
    validateBody(UploadChunkSchema),
    controller.upload,
  );
}
