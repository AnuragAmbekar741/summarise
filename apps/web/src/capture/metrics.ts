/**
 * Lag and chunk statistics for the debug panel, the export and the exit gate.
 *
 * lagEnd    = transcript shown - chunk ended    (processing delay)
 * lagSpeech = transcript shown - chunk started  (worst-case wait for the chunk's
 *             first word; the stage 0 gate is lagSpeech p95 under 60 s)
 */
import type { ChunkRow } from './db'
import type { CutReason } from './recorder'

export type ChunkMetrics = {
  seq: number
  status: ChunkRow['status']
  reason: CutReason
  startMs: number
  durationMs: number
  bytes: number
  attempts: number
  /** Last upload round trip, Groq included. */
  roundTripMs: number | null
  groqMs: number | null
  lagEndMs: number | null
  lagSpeechMs: number | null
  words: number
  dropped: number
  lastError: string | null
}

export type Summary = {
  chunks: number
  transcribed: number
  silent: number
  failed: number
  pending: number
  recordedMs: number
  bytes: number
  cuts: Record<CutReason, number>
  /** Forced cuts as a share of in-speech cuts (silence + force); gate: under 20%. */
  forceCutShare: number | null
  lagSpeechP50: number | null
  lagSpeechP95: number | null
  lagEndP50: number | null
  lagEndP95: number | null
}

export function chunkMetrics(row: ChunkRow): ChunkMetrics {
  const shown = row.status === 'transcribed' && row.shownAt !== undefined
  return {
    seq: row.seq,
    status: row.status,
    reason: row.reason,
    startMs: row.startMs,
    durationMs: row.durationMs,
    bytes: row.bytes,
    attempts: row.attempts,
    roundTripMs: shown && row.sentAt !== undefined ? row.shownAt! - row.sentAt : null,
    groqMs: row.groqMs ?? null,
    lagEndMs: shown ? row.shownAt! - row.endedAt : null,
    lagSpeechMs: shown ? row.shownAt! - (row.endedAt - row.durationMs) : null,
    words: row.segments.reduce((n, s) => n + s.text.split(/\s+/).filter(Boolean).length, 0),
    dropped: row.droppedCount,
    lastError: row.lastError ?? null,
  }
}

/** Nearest-rank percentile; null for no values. */
export function percentile(values: number[], p: number): number | null {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  const rank = Math.max(1, Math.ceil(p * sorted.length))
  return sorted[rank - 1]
}

export function summarize(rows: ChunkRow[]): Summary {
  const metrics = rows.map(chunkMetrics)
  const count = (status: ChunkRow['status']) => rows.filter((r) => r.status === status).length
  const cuts: Record<CutReason, number> = { silence: 0, force: 0, pause: 0, stop: 0 }
  for (const row of rows) cuts[row.reason] += 1
  const inSpeech = cuts.silence + cuts.force
  const lagSpeech = metrics.flatMap((m) => (m.lagSpeechMs === null ? [] : [m.lagSpeechMs]))
  const lagEnd = metrics.flatMap((m) => (m.lagEndMs === null ? [] : [m.lagEndMs]))
  return {
    chunks: rows.length,
    transcribed: count('transcribed'),
    silent: count('silent'),
    failed: count('failed'),
    pending: count('recorded') + count('uploading'),
    recordedMs: rows.reduce((n, r) => n + r.durationMs, 0),
    bytes: rows.reduce((n, r) => n + r.bytes, 0),
    cuts,
    forceCutShare: inSpeech ? cuts.force / inSpeech : null,
    lagSpeechP50: percentile(lagSpeech, 0.5),
    lagSpeechP95: percentile(lagSpeech, 0.95),
    lagEndP50: percentile(lagEnd, 0.5),
    lagEndP95: percentile(lagEnd, 0.95),
  }
}

/** `mm:ss`, or `h:mm:ss` from one hour. */
export function clockTime(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const mm = String(m).padStart(2, '0')
  const ss = String(s).padStart(2, '0')
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}
