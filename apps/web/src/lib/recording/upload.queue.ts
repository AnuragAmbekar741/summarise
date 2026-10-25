import axios from 'axios';

import { stopNote, uploadChunk } from '@/api/note/note.api';

import { recordingDb } from './recording.store';

const MIN_RETRY_MS = 2_000;
const MAX_RETRY_MS = 30_000;

// Sends everything waiting in the recording store, one request at a time,
// until the store is empty. Chunks go oldest first, so the service always
// has the previous segment to use as context.
//
// A failed send is retried later; only an error the service will never
// accept (a 4xx other than 401) drops the item.
export function createUploadQueue() {
  let active = false;
  let draining = false;
  let wokenWhileDraining = false;
  let failures = 0;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;

  // Stops first: they are small, and they let the service know the total
  // even while chunks are still retrying.
  async function sendNext(): Promise<boolean> {
    const stopping = await recordingDb.sessions
      .filter((session) => session.pendingStop !== undefined)
      .first();
    if (stopping?.pendingStop) {
      const { noteId, pendingStop } = stopping;
      await send(() => stopNote(noteId, pendingStop));
      // Nothing more to record; the remaining chunks upload on their own.
      await recordingDb.sessions.delete(noteId);
      return true;
    }

    const chunk = await recordingDb.chunks.orderBy('createdAt').first();
    if (!chunk) return false;
    await send(() => uploadChunk(chunk.noteId, chunk));
    await recordingDb.chunks.delete([chunk.noteId, chunk.seq]);
    return true;
  }

  async function drain() {
    while (active) {
      try {
        if (!(await sendNext())) return;
        failures = 0;
      } catch (error) {
        failures += 1;
        retryTimer = setTimeout(wake, retryDelay(error, failures));
        return;
      }
    }
  }

  // Runs the queue now. Safe to call any time, e.g. right after a chunk is
  // saved; a call while it is already running makes it check again after.
  function wake() {
    if (!active) return;
    clearTimeout(retryTimer);
    if (draining) {
      wokenWhileDraining = true;
      return;
    }
    draining = true;
    void drain().finally(() => {
      draining = false;
      if (wokenWhileDraining) {
        wokenWhileDraining = false;
        wake();
      }
    });
  }

  function start() {
    active = true;
    window.addEventListener('online', wake);
    wake();
  }

  function stop() {
    active = false;
    clearTimeout(retryTimer);
    window.removeEventListener('online', wake);
  }

  return { start, stop, wake };
}

export type UploadQueue = ReturnType<typeof createUploadQueue>;

// Runs a request. A permanent rejection is logged and swallowed, so the
// caller drops the item; anything else is thrown to be retried.
async function send(request: () => Promise<unknown>) {
  try {
    await request();
  } catch (error) {
    if (!isPermanent(error)) throw error;
    console.error('Upload rejected, dropping it', error);
  }
}

// 4xx means the request itself is wrong and retrying won't help. 401 is the
// exception: the session ran out, and signing in again fixes it.
function isPermanent(error: unknown) {
  if (!axios.isAxiosError(error) || !error.response) return false;
  const { status } = error.response;
  return status >= 400 && status < 500 && status !== 401;
}

// The service's Retry-After if it sent one, otherwise 2s, 4s, 8s… up to 30s.
function retryDelay(error: unknown, failures: number) {
  if (axios.isAxiosError(error)) {
    const seconds = Number(error.response?.headers['retry-after']);
    if (seconds > 0) return seconds * 1000;
  }
  return Math.min(MIN_RETRY_MS * 2 ** (failures - 1), MAX_RETRY_MS);
}
