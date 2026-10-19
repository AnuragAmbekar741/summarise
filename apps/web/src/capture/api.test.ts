import { describe, expect, it } from 'vitest'
import { HttpError, UPLOAD_TIMEOUT_MS, sha256Hex, uploadChunk } from './api'
import type { ChunkRow } from './db'

function row(overrides: Partial<ChunkRow> = {}): ChunkRow {
  return {
    id: 's1:3',
    sessionId: 's1',
    seq: 3,
    startMs: 60_000,
    durationMs: 28_500,
    endedAt: 0,
    reason: 'silence',
    mime: 'audio/webm;codecs=opus',
    bytes: 5,
    sha256: 'abc',
    blob: new Blob(['audio']),
    status: 'recorded',
    attempts: 0,
    segments: [],
    droppedCount: 0,
    ...overrides,
  }
}

describe('uploadChunk', () => {
  it('posts the chunk as multipart and maps the response', async () => {
    let url = ''
    let form = new FormData()
    let signal: AbortSignal | null | undefined
    const fakeFetch = (async (input: string, init: RequestInit) => {
      url = input
      form = init.body as FormData
      signal = init.signal
      return Response.json({
        seq: 3,
        segments: [{ seq: 3, start_ms: 60_500, end_ms: 62_000, text: 'hello' }],
        dropped_count: 1,
        groq_latency_ms: 420,
      })
    }) as unknown as typeof fetch

    const result = await uploadChunk(row(), fakeFetch, () => 1_700_000_000_500)

    expect(url).toBe('/api/proof/sessions/s1/chunks')
    expect(signal).toBeInstanceOf(AbortSignal)
    expect((form.get('file') as File).name).toBe('3.webm')
    expect(Object.fromEntries([...form.entries()].filter(([k]) => k !== 'file'))).toEqual({
      seq: '3',
      start_ms: '60000',
      duration_ms: '28500',
      sha256: 'abc',
      client_sent_at: '1700000000.5',
    })
    expect(result).toEqual({
      seq: 3,
      segments: [{ seq: 3, startMs: 60_500, endMs: 62_000, text: 'hello' }],
      droppedCount: 1,
      groqLatencyMs: 420,
    })
  })

  it('names mp4 chunks .m4a', async () => {
    let form = new FormData()
    const fakeFetch = (async (_: string, init: RequestInit) => {
      form = init.body as FormData
      return Response.json({ seq: 3, segments: [], dropped_count: 0, groq_latency_ms: 1 })
    }) as unknown as typeof fetch
    await uploadChunk(row({ mime: 'audio/mp4' }), fakeFetch)
    expect((form.get('file') as File).name).toBe('3.m4a')
  })

  it('raises HttpError with the server detail', async () => {
    const fakeFetch = (async () =>
      Response.json({ detail: 'sha256 does not match the file' }, { status: 422 })) as unknown as typeof fetch
    const error = await uploadChunk(row(), fakeFetch).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(HttpError)
    expect((error as HttpError).permanent).toBe(true)
    expect((error as HttpError).message).toContain('sha256 does not match')
  })
})

describe('upload timeout', () => {
  it('rejects with a non-permanent error when the signal fires', async () => {
    const fakeFetch = ((_: string, init: RequestInit) =>
      new Promise<Response>((_, reject) => {
        init.signal?.addEventListener('abort', () => reject(init.signal?.reason))
      })) as unknown as typeof fetch
    const error = await uploadChunk(row(), fakeFetch, Date.now, 20).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(DOMException)
    expect((error as DOMException).name).toBe('TimeoutError')
    expect(error).not.toBeInstanceOf(HttpError) // the queue retries anything but HttpError.permanent
    expect(UPLOAD_TIMEOUT_MS).toBeGreaterThanOrEqual(10_000)
  })
})

describe('HttpError.permanent', () => {
  it('treats 5xx, 408 and 429 as retryable', () => {
    expect(new HttpError(502, '').permanent).toBe(false)
    expect(new HttpError(429, '').permanent).toBe(false)
    expect(new HttpError(408, '').permanent).toBe(false)
    expect(new HttpError(409, '').permanent).toBe(true)
  })
})

describe('sha256Hex', () => {
  it('hashes blob bytes', async () => {
    expect(await sha256Hex(new Blob(['abc']))).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    )
  })
})
