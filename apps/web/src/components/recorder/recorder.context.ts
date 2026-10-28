import { createContext } from 'react';

import type { RecorderState } from '@/lib/recording/chunk.recorder';

export type RecorderContextValue = {
  // The note being recorded in this tab, or null when none is.
  noteId: string | null;
  state: RecorderState;
  // Recording time of the active note. Read it on a timer to show a clock.
  getElapsedMs: () => number;
  start: (noteId: string) => Promise<void>;
  pause: () => Promise<void>;
  // Also carries on a note whose recording was cut off by a reload.
  resume: (noteId: string) => Promise<void>;
  stop: (noteId: string) => Promise<void>;
  // Turns the mic off and drops what this browser still holds for the note,
  // without sending it. Used before the note is deleted.
  discard: (noteId: string) => Promise<void>;
};

export const RecorderContext = createContext<RecorderContextValue | null>(null);
