import {
  CreateNoteSchema,
  NoteParamsSchema,
  StopNoteSchema,
} from '@summarise/contract';
import { Router, type RequestHandler } from 'express';

import { validateBody, validateParams } from '../../common/validate.middleware';
import { createNoteController } from './note.controller';
import type { NoteService } from './note.service';

export function noteRoutes(
  noteService: NoteService,
  requireAuth: RequestHandler,
) {
  const controller = createNoteController(noteService);

  // requireAuth is per route: this router also sees /notes/:noteId/chunks
  // and /transcript requests, which check auth themselves.
  return Router()
    .get('/', requireAuth, controller.list)
    .post('/', requireAuth, validateBody(CreateNoteSchema), controller.create)
    .get(
      '/:noteId',
      requireAuth,
      validateParams(NoteParamsSchema),
      controller.get,
    )
    .post(
      '/:noteId/stop',
      requireAuth,
      validateParams(NoteParamsSchema),
      validateBody(StopNoteSchema),
      controller.stop,
    );
}
