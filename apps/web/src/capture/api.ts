/** Client for the stage 0 proof API (`/api/proof`). */
import { audioExtension } from './audio-file'
import type { ChunkRow, TranscriptSegment } from './db'

export class HttpError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }

  /** 4xx other than 408 and 429: retrying the same upload cannot succeed. */
  get permanent(): boolean {
    return this.status >= 400 && this.status < 500 && this.status !== 408 && this.status !== 429
  }
}

export type ChunkResponse = {
  seq: number
  segments: TranscriptSegment[]
  droppedCount: number
  groqLatencyMs: number
}

type Fetch = typeof fetch

/**
 * A chunk is at most 8 MB; on a working connection it uploads and transcribes
 * in a few seconds. Past this the socket is treated as dead and the queue retries.
 */
export const UPLOAD_TIMEOUT_MS = 30_000

export async function createSession(
  label: string,
  vocabulary: string[],
  fetchFn: Fetch = fetch,
): Promise<string> {
  const response = await fetchFn('/api/proof/sessions', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ label, vocabulary }),
  })
  const body = await json(response)
  return body.session_id as string
}

export async function uploadChunk(
  row: ChunkRow,
  fetchFn: Fetch = fetch,
  now: () => number = Date.now,
  timeoutMs: number = UPLOAD_TIMEOUT_MS,
): Promise<ChunkResponse> {
  const form = new FormData()
  form.append('file', row.blob, `${row.seq}.${audioExtension(row.mime)}`)
  form.append('seq', String(row.seq))
  form.append('start_ms', String(row.startMs))
  form.append('duration_ms', String(row.durationMs))
  form.append('sha256', row.sha256)
  form.append('client_sent_at', String(now() / 1000))

  const response = await fetchFn(`/api/proof/sessions/${row.sessionId}/chunks`, {
    method: 'POST',
    body: form,
    signal: AbortSignal.timeout(timeoutMs),
  })
  const body = await json(response)
  return {
    seq: body.seq,
    segments: (body.segments as { seq: number; start_ms: number; end_ms: number; text: string }[])
      .map((s) => ({ seq: s.seq, startMs: s.start_ms, endMs: s.end_ms, text: s.text })),
    droppedCount: body.dropped_count,
    groqLatencyMs: body.groq_latency_ms,
  }
}

export async function sha256Hex(blob: Blob): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer())
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}

// oxlint-disable-next-line typescript/no-explicit-any
async function json(response: Response): Promise<any> {
  if (!response.ok) {
    let detail = response.statusText
    try {
      detail = (await response.json()).detail ?? detail
    } catch {
      // body was not JSON
    }
    throw new HttpError(response.status, `${response.status} ${detail}`)
  }
  return response.json()
}
