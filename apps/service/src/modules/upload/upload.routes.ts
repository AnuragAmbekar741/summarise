import { CreateUploadSchema, NoteParamsSchema } from '@summarise/contract';
import { Router, type RequestHandler } from 'express';

import { validateBody, validateParams } from '../../common/validate.middleware';
import { createUploadController } from './upload.controller';
import type { UploadService } from './upload.service';

// Mounted at /notes.
export function uploadRoutes(
  uploadService: UploadService,
  requireAuth: RequestHandler,
) {
  const controller = createUploadController(uploadService);

  return Router()
    .post(
      '/uploads',
      requireAuth,
      validateBody(CreateUploadSchema),
      controller.create,
    )
    .post(
      '/:noteId/upload/complete',
      requireAuth,
      validateParams(NoteParamsSchema),
      controller.complete,
    );
}
