import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { openCaptureDb, type ChunkRow, type SessionRow } from '../capture/db'
import { MIN_DB } from '../capture/level-meter'
import { CaptureSession, type CaptureState } from '../capture/session'
import type { QueueState } from '../capture/upload-queue'
import { micErrorMessage } from './use-audio-inputs'

export type CaptureStatus = 'idle' | 'starting' | CaptureState

export type StartOptions = {
  label: string
  vocabulary: string[]
  deviceId?: string
  /** Replace the microphone, e.g. with an audio file in dev. */
  stream?: MediaStream
}

const EMPTY_QUEUE: QueueState = { pending: 0, lastError: null, retryAt: null }
const SILENT_LEVEL = { db: MIN_DB, threshold: MIN_DB }

/** Drives one CaptureSession and exposes what the page renders. */
export function useCapture() {
  const db = useMemo(() => openCaptureDb(), [])
  const session = useRef<CaptureSession | null>(null)
  const latestLevel = useRef(SILENT_LEVEL)

  const [status, setStatus] = useState<CaptureStatus>('idle')
  const [chunks, setChunks] = useState<ChunkRow[]>([])
  const [queue, setQueue] = useState<QueueState>(EMPTY_QUEUE)
  const [level, setLevel] = useState(SILENT_LEVEL)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [elapsedMs, setElapsedMs] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const upsert = useCallback((row: ChunkRow) => {
    setChunks((rows) => [...rows.filter((r) => r.seq !== row.seq), row].sort((a, b) => a.seq - b.seq))
  }, [])

  // Level arrives 20 times a second; the UI refreshes it with the clock every 100 ms.
  useEffect(() => {
    if (status !== 'recording' && status !== 'paused') return
    const tick = setInterval(() => {
      setLevel(latestLevel.current)
      setElapsedMs(session.current?.elapsedMs() ?? 0)
    }, 100)
    return () => clearInterval(tick)
  }, [status])

  useEffect(() => () => void session.current?.close(), [])

  const start = useCallback(
    async (options: StartOptions) => {
      setError(null)
      setChunks([])
      setQueue(EMPTY_QUEUE)
      setStatus('starting')
      await session.current?.close()
      session.current = null
      try {
        const next = await CaptureSession.open({
          ...options,
          db,
          events: {
            onLevel: (value, threshold) => (latestLevel.current = { db: value, threshold }),
            onChunk: upsert,
            onTranscribed: upsert,
            onQueue: setQueue,
            onState: setStatus,
          },
        })
        session.current = next
        setSessionId(next.sessionId)
        await next.start()
      } catch (e) {
        setStatus('idle')
        setError(micErrorMessage(e))
      }
    },
    [db, upsert],
  )

  const pause = useCallback(() => session.current?.pause(), [])
  const resume = useCallback(() => session.current?.resume(), [])
  const stop = useCallback(async () => {
    await session.current?.stop()
    setElapsedMs(session.current?.elapsedMs() ?? 0)
  }, [])

  const sessionRow = useCallback(
    async (): Promise<SessionRow | undefined> => (sessionId ? db.sessions.get(sessionId) : undefined),
    [db, sessionId],
  )

  return {
    status,
    sessionId,
    chunks,
    queue,
    level,
    elapsedMs,
    error,
    start,
    pause,
    resume,
    stop,
    sessionRow,
  }
}
