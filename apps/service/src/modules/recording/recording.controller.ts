import type {
  UploadChunkInput,
  UploadChunkResponse,
} from '@summarise/contract';
import type { Request, Response } from 'express';

import { HttpError } from '../../common/error.utils';
import type { RecordingService } from './recording.service';

export function createRecordingController(recordingService: RecordingService) {
  return {
    async upload(
      req: Request<{ noteId: string }>,
      res: Response<UploadChunkResponse>,
    ) {
      if (!req.file) {
        throw new HttpError(400, 'VALIDATION_ERROR', 'Invalid request body', {
          audio: ['Attach the audio file'],
        });
      }
      // requireAuth runs first and sets userId.
      const segment = await recordingService.uploadChunk(
        req.userId!,
        req.params.noteId,
        req.body as UploadChunkInput,
        req.file,
      );
      res.status(200).json({ segment });
    },
  };
}
