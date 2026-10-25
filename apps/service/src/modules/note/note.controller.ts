import type {
  CreateNoteInput,
  NoteResponse,
  StopNoteInput,
} from '@summarise/contract';
import type { Request, Response } from 'express';

import type { NoteService } from './note.service';

type NoteRequest = Request<{ noteId: string }>;

// requireAuth runs before every handler here and sets req.userId.
export function createNoteController(noteService: NoteService) {
  return {
    async create(req: Request, res: Response<NoteResponse>) {
      const note = await noteService.create(
        req.userId!,
        req.body as CreateNoteInput,
      );
      res.status(201).json({ note });
    },

    async get(req: NoteRequest, res: Response<NoteResponse>) {
      const note = await noteService.get(req.userId!, req.params.noteId);
      res.status(200).json({ note });
    },

    async stop(req: NoteRequest, res: Response<NoteResponse>) {
      const note = await noteService.stop(
        req.userId!,
        req.params.noteId,
        req.body as StopNoteInput,
      );
      res.status(200).json({ note });
    },
  };
}
