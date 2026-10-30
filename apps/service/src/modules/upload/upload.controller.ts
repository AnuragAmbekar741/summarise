import type {
  CreateUploadInput,
  CreateUploadResponse,
  NoteResponse,
} from '@summarise/contract';
import type { Request, Response } from 'express';

import type { UploadService } from './upload.service';

// requireAuth runs before every handler here and sets req.userId.
export function createUploadController(uploadService: UploadService) {
  return {
    async create(req: Request, res: Response<CreateUploadResponse>) {
      const upload = await uploadService.create(
        req.userId!,
        req.body as CreateUploadInput,
      );
      res.status(201).json(upload);
    },

    async complete(
      req: Request<{ noteId: string }>,
      res: Response<NoteResponse>,
    ) {
      const note = await uploadService.complete(req.userId!, req.params.noteId);
      res.status(200).json({ note });
    },
  };
}
