import { strFromU8, unzipSync } from 'fflate'
import { describe, expect, it } from 'vitest'
import type { ChunkRow, SessionRow } from './db'
import { audioZip, chunkFileName, sessionReport } from './export'

const session: SessionRow = {
  id: 's1',
  label: 'CS 229 week 3',
  vocabulary: ['precision', 'recall'],
  startedAt: 1,
  status: 'stopped',
  mime: 'audio/webm;codecs=opus',
}

function row(seq: number, overrides: Partial<ChunkRow> = {}): ChunkRow {
  return {
    id: `s1:${seq}`,
    sessionId: 's1',
    seq,
    startMs: (seq - 1) * 30_000,
    durationMs: 30_000,
    endedAt: 100_000,
    reason: 'silence',
    mime: 'audio/webm;codecs=opus',
    bytes: 5,
    sha256: 'x',
    blob: new Blob([`audio${seq}`]),
    status: 'transcribed',
    attempts: 1,
    shownAt: 101_000,
    segments: [{ seq, startMs: seq, endMs: seq + 1, text: `text ${seq}` }],
    droppedCount: 0,
    ...overrides,
  }
}

describe('sessionReport', () => {
  it('orders chunks, joins the transcript and omits vocabulary words', () => {
    const report = sessionReport(session, [row(2), row(1)], 'test-agent')
    expect(report.chunks.map((c) => c.seq)).toEqual([1, 2])
    expect(report.transcript.map((s) => s.text)).toEqual(['text 1', 'text 2'])
    expect(report.session).not.toHaveProperty('vocabulary')
    expect(report.session.vocabularySize).toBe(2)
    expect(report.summary.transcribed).toBe(2)
  })
})

describe('chunkFileName', () => {
  it('pads the seq and maps the container', () => {
    expect(chunkFileName(row(7))).toBe('00007.webm')
    expect(chunkFileName(row(12, { mime: 'audio/mp4' }))).toBe('00012.m4a')
  })
})

describe('audioZip', () => {
  it('holds every non-empty chunk and the report', async () => {
    const rows = [row(1), row(2, { bytes: 0, blob: new Blob(), status: 'failed' })]
    const zip = await audioZip(sessionReport(session, rows, 'ua'), rows)
    const files = unzipSync(new Uint8Array(await zip.arrayBuffer()))
    expect(Object.keys(files).sort()).toEqual(['00001.webm', 'session.json'])
    expect(strFromU8(files['00001.webm'])).toBe('audio1')
    expect(JSON.parse(strFromU8(files['session.json'])).summary.chunks).toBe(2)
  })
})
