/**
 * IndexedDB (Dexie). Every chunk is stored here, blob included, before any upload,
 * so a network or server failure never loses audio. Stage 0 keeps chunks after
 * transcription as a full-lecture backup; stage 2 deletes them once transcribed.
 */
import Dexie, { type EntityTable } from 'dexie'
import type { CutReason } from './recorder'

export type ChunkStatus = 'recorded' | 'uploading' | 'transcribed' | 'silent' | 'failed'

export type TranscriptSegment = { seq: number; startMs: number; endMs: number; text: string }

export type ChunkRow = {
  id: string // `${sessionId}:${seq}`
  sessionId: string
  seq: number
  startMs: number
  durationMs: number
  endedAt: number
  reason: CutReason
  mime: string
  bytes: number
  sha256: string
  blob: Blob
  status: ChunkStatus
  attempts: number
  lastError?: string
  /** Wall-clock ms: last upload attempt started, transcript received. */
  sentAt?: number
  shownAt?: number
  groqMs?: number
  segments: TranscriptSegment[]
  droppedCount: number
}

export type SessionRow = {
  id: string // server session id
  label: string
  vocabulary: string[]
  startedAt: number
  status: 'recording' | 'paused' | 'stopped'
  mime: string
}

export type CaptureDb = Dexie & {
  chunks: EntityTable<ChunkRow, 'id'>
  sessions: EntityTable<SessionRow, 'id'>
}

export function openCaptureDb(name = 'lsa-proof'): CaptureDb {
  const db = new Dexie(name) as CaptureDb
  db.version(1).stores({
    sessions: 'id, status',
    chunks: 'id, sessionId, [sessionId+seq], [sessionId+status]',
  })
  return db
}

export function chunkId(sessionId: string, seq: number): string {
  return `${sessionId}:${seq}`
}
