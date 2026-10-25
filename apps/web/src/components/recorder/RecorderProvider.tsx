import { useEffect, useRef, useState, type ReactNode } from 'react';

import {
  createChunkRecorder,
  type ChunkRecorder,
  type RecorderState,
} from '@/lib/recording/chunk.recorder';
import { recordingDb, saveChunk } from '@/lib/recording/recording.store';
import { createUploadQueue } from '@/lib/recording/upload.queue';

import { RecorderContext } from './recorder.context';

type Active = { noteId: string; recorder: ChunkRecorder };
type Status = { noteId: string | null; state: RecorderState };

const IDLE: Status = { noteId: null, state: 'idle' };

// Holds the one recording of this tab above the routes, so it keeps going
// while the user moves between pages, and runs the upload queue.
export function RecorderProvider({ children }: { children: ReactNode }) {
  const [queue] = useState(createUploadQueue);
  const activeRef = useRef<Active | null>(null);
  const [status, setStatus] = useState<Status>(IDLE);

  useEffect(() => {
    queue.start();
    return () => {
      queue.stop();
      // Signing out: keep what was recorded and turn the mic off.
      void activeRef.current?.recorder.pause();
    };
  }, [queue]);

  function sync() {
    const active = activeRef.current;
    setStatus(
      active ? { noteId: active.noteId, state: active.recorder.state() } : IDLE,
    );
  }

  function activate(noteId: string, elapsedMs: number) {
    const recorder = createChunkRecorder({
      elapsedMs,
      onChunk: async (chunk) => {
        await saveChunk(noteId, chunk);
        queue.wake();
      },
    });
    activeRef.current = { noteId, recorder };
    return recorder;
  }

  // Turns the mic on. If that fails (e.g. permission denied) the recorder
  // is let go; the session stays, so the user can try Resume.
  async function record(recorder: ChunkRecorder) {
    try {
      await recorder.resume();
    } catch (error) {
      if (recorder.state() === 'idle') activeRef.current = null;
      throw error;
    } finally {
      sync();
    }
  }

  function assertFree(noteId: string) {
    const active = activeRef.current;
    if (active && active.noteId !== noteId) {
      throw new Error('Another note is already recording');
    }
  }

  async function start(noteId: string) {
    assertFree(noteId);
    if (activeRef.current) return;
    await recordingDb.sessions.put({ noteId, nextSeq: 0, elapsedMs: 0 });
    await record(activate(noteId, 0));
  }

  async function resume(noteId: string) {
    assertFree(noteId);
    let recorder = activeRef.current?.recorder;
    if (!recorder) {
      // The tab was reloaded: carry on from the saved counters.
      const session = await recordingDb.sessions.get(noteId);
      if (!session) throw new Error('This recording can no longer be resumed');
      recorder = activate(noteId, session.elapsedMs);
    }
    await record(recorder);
  }

  async function pause() {
    const active = activeRef.current;
    if (!active) return;
    // The state flips at once; the last chunk is saved in the background.
    const pausing = active.recorder.pause();
    sync();
    await pausing;
  }

  // Saves the last chunk, then queues the Stop with the final chunk count.
  async function stop(noteId: string) {
    const active = activeRef.current;
    let durationMs: number | undefined;
    if (active?.noteId === noteId) {
      const stopping = active.recorder.stop();
      sync();
      await stopping;
      durationMs = Math.round(active.recorder.elapsedMs());
      activeRef.current = null;
      sync();
    }

    const session = await recordingDb.sessions.get(noteId);
    if (!session) return;
    await recordingDb.sessions.update(noteId, {
      pendingStop: {
        durationMs: durationMs ?? session.elapsedMs,
        totalChunks: session.nextSeq,
      },
    });
    queue.wake();
  }

  function getElapsedMs() {
    return activeRef.current?.recorder.elapsedMs() ?? 0;
  }

  return (
    <RecorderContext.Provider
      value={{ ...status, getElapsedMs, start, pause, resume, stop }}
    >
      {children}
    </RecorderContext.Provider>
  );
}
