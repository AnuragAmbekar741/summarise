import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it } from 'vitest'
import { HttpError, type ChunkResponse } from './api'
import { chunkId, openCaptureDb, type CaptureDb, type ChunkRow } from './db'
import { UploadQueue } from './upload-queue'

const SESSION = 's1'
let dbs: CaptureDb[] = []

function newDb(): CaptureDb {
  const db = openCaptureDb(`test-${crypto.randomUUID()}`)
  dbs.push(db)
  return db
}

afterEach(async () => {
  await Promise.all(dbs.map((db) => db.delete()))
  dbs = []
})

function row(seq: number, overrides: Partial<ChunkRow> = {}): ChunkRow {
  return {
    id: chunkId(SESSION, seq),
    sessionId: SESSION,
    seq,
    startMs: seq * 30_000,
    durationMs: 30_000,
    endedAt: 0,
    reason: 'silence',
    mime: 'audio/webm',
    bytes: 1,
    sha256: 'x',
    blob: new Blob([String(seq)]),
    status: 'recorded',
    attempts: 0,
    segments: [],
    droppedCount: 0,
    ...overrides,
  }
}

function ok(row: ChunkRow): ChunkResponse {
  return {
    seq: row.seq,
    segments: [{ seq: row.seq, startMs: row.startMs, endMs: row.startMs + 500, text: `chunk ${row.seq}` }],
    droppedCount: 0,
    groqLatencyMs: 300,
  }
}

async function until(check: () => Promise<boolean>, timeoutMs = 2_000): Promise<void> {
  const start = Date.now()
  while (!(await check())) {
    if (Date.now() - start > timeoutMs) throw new Error('timed out')
    await new Promise((r) => setTimeout(r, 5))
  }
}

async function statuses(db: CaptureDb): Promise<string[]> {
  const rows = await db.chunks.where('sessionId').equals(SESSION).sortBy('seq')
  return rows.map((r) => `${r.seq}:${r.status}`)
}

describe('UploadQueue', () => {
  it('uploads in seq order and stores the transcript', async () => {
    const db = newDb()
    await db.chunks.bulkAdd([row(3), row(1), row(2)])
    const order: number[] = []
    const transcribed: number[] = []
    const reported: ChunkRow[] = []
    let clock = 1_000
    const queue = new UploadQueue({
      db,
      sessionId: SESSION,
      upload: async (r) => {
        order.push(r.seq)
        clock += 700
        return ok(r)
      },
      onTranscribed: (r) => {
        transcribed.push(r.seq)
        reported.push(r)
      },
      now: () => clock,
    })

    await queue.start()
    await until(async () => transcribed.length === 3)
    await queue.stop()

    expect(order).toEqual([1, 2, 3])
    expect(await statuses(db)).toEqual(['1:transcribed', '2:transcribed', '3:transcribed'])
    const first = await db.chunks.get(chunkId(SESSION, 1))
    expect(first?.segments[0].text).toBe('chunk 1')
    expect(first?.attempts).toBe(1)
    expect(queue.current.pending).toBe(0)
    // The row handed to the UI matches what was stored, round-trip timing included.
    expect(reported[0]).toMatchObject({ status: 'transcribed', attempts: 1 })
    expect(reported[0].shownAt! - reported[0].sentAt!).toBe(700)
    expect(reported[0]).toEqual({ ...first })
  })

  it('backs off on network errors and retries the same chunk', async () => {
    const db = newDb()
    await db.chunks.bulkAdd([row(1), row(2)])
    const delays: number[] = []
    let calls = 0
    const queue = new UploadQueue({
      db,
      sessionId: SESSION,
      upload: async (r) => {
        calls += 1
        if (calls <= 3) throw new TypeError('Failed to fetch')
        return ok(r)
      },
      sleep: async (ms) => {
        delays.push(ms)
      },
    })

    await queue.start()
    await until(async () => (await statuses(db)).every((s) => s.endsWith('transcribed')))
    await queue.stop()

    expect(delays).toEqual([2_000, 4_000, 8_000])
    expect((await db.chunks.get(chunkId(SESSION, 1)))?.attempts).toBe(4)
    expect((await db.chunks.get(chunkId(SESSION, 2)))?.attempts).toBe(1)
  })

  it('caps the backoff at 60 s', async () => {
    const db = newDb()
    await db.chunks.add(row(1))
    const delays: number[] = []
    const queue = new UploadQueue({
      db,
      sessionId: SESSION,
      upload: async () => {
        throw new HttpError(502, 'bad gateway')
      },
      sleep: async (ms) => {
        delays.push(ms)
      },
    })

    await queue.start()
    await until(async () => delays.length >= 8)
    await queue.stop()

    expect(delays.slice(0, 7)).toEqual([2_000, 4_000, 8_000, 16_000, 32_000, 60_000, 60_000])
    expect((await db.chunks.get(chunkId(SESSION, 1)))?.status).toBe('recorded')
  })

  it('marks permanent failures and moves on', async () => {
    const db = newDb()
    await db.chunks.bulkAdd([row(1), row(2)])
    const queue = new UploadQueue({
      db,
      sessionId: SESSION,
      upload: async (r) => {
        if (r.seq === 1) throw new HttpError(422, '422 sha256 does not match the file')
        return ok(r)
      },
    })

    await queue.start()
    await until(async () => (await statuses(db)).includes('2:transcribed'))
    await queue.stop()

    const failed = await db.chunks.get(chunkId(SESSION, 1))
    expect(failed?.status).toBe('failed')
    expect(failed?.lastError).toContain('sha256')
  })

  it('resends chunks left uploading by a closed tab', async () => {
    const db = newDb()
    await db.chunks.add(row(1, { status: 'uploading', attempts: 1 }))
    const queue = new UploadQueue({ db, sessionId: SESSION, upload: async (r) => ok(r) })

    await queue.start()
    await until(async () => (await statuses(db))[0] === '1:transcribed')
    await queue.stop()

    expect((await db.chunks.get(chunkId(SESSION, 1)))?.attempts).toBe(2)
  })

  it('picks up chunks added later when woken', async () => {
    const db = newDb()
    const queue = new UploadQueue({ db, sessionId: SESSION, upload: async (r) => ok(r) })
    await queue.start()

    await db.chunks.add(row(1))
    queue.wake()
    await until(async () => (await statuses(db))[0] === '1:transcribed')
    await queue.stop()
  })

  it('leaves silent chunks and other sessions alone', async () => {
    const db = newDb()
    await db.chunks.bulkAdd([
      row(1, { status: 'silent' }),
      { ...row(1), id: 'other:1', sessionId: 'other' },
      row(2),
    ])
    const uploaded: string[] = []
    const queue = new UploadQueue({
      db,
      sessionId: SESSION,
      upload: async (r) => {
        uploaded.push(r.id)
        return ok(r)
      },
    })

    await queue.start()
    await until(async () => uploaded.length === 1)
    await queue.stop()

    expect(uploaded).toEqual([chunkId(SESSION, 2)])
    expect((await db.chunks.get('other:1'))?.status).toBe('recorded')
  })
})
