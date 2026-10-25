import type { TranscriptResponse } from '@summarise/contract';
import type { Request, Response } from 'express';

import type { NoteService } from '../note/note.service';
import type { TranscriptService } from './transcript.service';

type TranscriptControllerDeps = {
  noteService: NoteService;
  transcriptService: TranscriptService;
};

export function createTranscriptController({
  noteService,
  transcriptService,
}: TranscriptControllerDeps) {
  return {
    async get(
      req: Request<{ noteId: string }>,
      res: Response<TranscriptResponse>,
    ) {
      // requireAuth runs first and sets userId.
      const note = await noteService.getOwnedNote(
        req.userId!,
        req.params.noteId,
      );
      res.status(200).json(await transcriptService.getTranscript(note));
    },
  };
}
