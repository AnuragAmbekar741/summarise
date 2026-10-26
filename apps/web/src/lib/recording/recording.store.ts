import type { StopNoteInput } from '@summarise/contract';
import { Dexie, type EntityTable, type Table } from 'dexie';

// A recorded chunk waiting to upload. It is deleted once the service has
// saved it, so whatever is in this table still needs sending.
export type LocalChunk = {
  noteId: string;
  seq: number;
  startMs: number;
  durationMs: number;
  // Its type (e.g. audio/webm;codecs=opus) is sent as the file's MIME type.
  audio: Blob;
  createdAt: number;
};

// The recorder's counters for a note, so a reload can carry on from them.
export type LocalSession = {
  noteId: string;
  nextSeq: number;
  elapsedMs: number;
  // Set on Stop and cleared once the service has accepted it.
  pendingStop?: StopNoteInput;
};

type RecordingDb = Dexie & {
  chunks: Table<LocalChunk, [string, number]>;
  sessions: EntityTable<LocalSession, 'noteId'>;
};

export const recordingDb = new Dexie('summarise-recording') as RecordingDb;

// The first entry is the primary key; the rest are indexes. A retried chunk
// keeps its [noteId+seq], so saving it again overwrites instead of adding.
recordingDb.version(1).stores({
  chunks: '[noteId+seq], noteId, createdAt',
  sessions: 'noteId',
});

// Gives the chunk the session's next seq and saves both together, so a seq
// is never used twice, even if the tab dies halfway.
export async function saveChunk(
  noteId: string,
  chunk: Omit<LocalChunk, 'noteId' | 'seq' | 'createdAt'>,
) {
  await recordingDb.transaction(
    'rw',
    recordingDb.chunks,
    recordingDb.sessions,
    async () => {
      const session = await recordingDb.sessions.get(noteId);
      if (!session) throw new Error(`No recording session for note ${noteId}`);
      await recordingDb.chunks.put({
        ...chunk,
        noteId,
        seq: session.nextSeq,
        createdAt: Date.now(),
      });
      await recordingDb.sessions.update(noteId, {
        nextSeq: session.nextSeq + 1,
        elapsedMs: chunk.startMs + chunk.durationMs,
      });
    },
  );
}
