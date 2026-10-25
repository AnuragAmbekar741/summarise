import { NoteParamsSchema } from '@summarise/contract';
import { Router, type RequestHandler } from 'express';

import { validateParams } from '../../common/validate.middleware';
import type { NoteService } from '../note/note.service';
import { createTranscriptController } from './transcript.controller';
import type { TranscriptService } from './transcript.service';

// Mounted at /notes/:noteId/transcript.
export function transcriptRoutes(
  deps: { noteService: NoteService; transcriptService: TranscriptService },
  requireAuth: RequestHandler,
) {
  const controller = createTranscriptController(deps);

  return Router({ mergeParams: true }).get(
    '/',
    requireAuth,
    validateParams(NoteParamsSchema),
    controller.get,
  );
}
