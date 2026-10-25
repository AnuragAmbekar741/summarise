import type { RequestHandler } from 'express';
import multer from 'multer';

import { HttpError } from '../../../common/error.utils';
import { audioExtension } from './recording.utils';

// A 30s chunk is ~120 KB at 32 kbps; 5 MB leaves plenty of room.
export const MAX_CHUNK_BYTES = 5 * 1024 * 1024;

// Reads the multipart `audio` file into memory (req.file) and its text
// fields into req.body. The audio is never written to disk here.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_CHUNK_BYTES, files: 1, fields: 10 },
  fileFilter: (_req, file, accept) => {
    if (audioExtension(file.mimetype)) return accept(null, true);
    accept(
      new HttpError(
        415,
        'UNSUPPORTED_AUDIO',
        `Unsupported audio type: ${file.mimetype}`,
      ),
    );
  },
}).single('audio');

export const uploadAudio: RequestHandler = (req, res, next) => {
  upload(req, res, (error: unknown) => {
    // No error, or our own 415 from fileFilter: pass it on as is.
    if (!error || error instanceof HttpError) return next(error);

    if (
      error instanceof multer.MulterError &&
      error.code === 'LIMIT_FILE_SIZE'
    ) {
      return next(
        new HttpError(413, 'FILE_TOO_LARGE', 'Audio chunk is larger than 5 MB'),
      );
    }

    // Anything else multer rejects is a bad request (extra files, too many
    // fields, a broken multipart body), never a server fault: memory storage
    // can't fail on our side.
    const message = error instanceof Error ? error.message : 'Invalid upload';
    next(
      new HttpError(400, 'VALIDATION_ERROR', 'Invalid upload', {
        audio: [message],
      }),
    );
  });
};
