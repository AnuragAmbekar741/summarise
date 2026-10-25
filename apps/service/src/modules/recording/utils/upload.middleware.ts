import { audioFileExtension } from '@summarise/speech-to-text';
import type { RequestHandler } from 'express';
import multer from 'multer';

import { HttpError } from '../../../common/error.utils';

// A 30s chunk is ~120 KB at 32 kbps; 5 MB leaves plenty of room.
export const MAX_CHUNK_BYTES = 5 * 1024 * 1024;

// Reads the multipart `audio` file into memory (req.file) and its text
// fields into req.body. The audio is never written to disk here.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_CHUNK_BYTES, files: 1, fields: 10 },
  fileFilter: (_req, file, accept) => {
    if (audioFileExtension(file.mimetype)) return accept(null, true);
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
    if (
      error instanceof multer.MulterError &&
      error.code === 'LIMIT_FILE_SIZE'
    ) {
      return next(
        new HttpError(413, 'FILE_TOO_LARGE', 'Audio chunk is larger than 5 MB'),
      );
    }
    next(error);
  });
};
