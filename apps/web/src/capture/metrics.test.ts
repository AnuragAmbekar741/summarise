import { describe, expect, it } from 'vitest'
import type { ChunkRow } from './db'
import { chunkMetrics, clockTime, percentile, summarize } from './metrics'

function row(seq: number, overrides: Partial<ChunkRow> = {}): ChunkRow {
  return {
    id: `s:${seq}`,
    sessionId: 's',
    seq,
    startMs: (seq - 1) * 30_000,
    durationMs: 30_000,
    endedAt: 1_000_000 + seq * 30_000,
    reason: 'silence',
    mime: 'audio/webm',
    bytes: 120_000,
    sha256: 'x',
    blob: new Blob(),
    status: 'transcribed',
    attempts: 1,
    sentAt: 1_000_000 + seq * 30_000 + 100,
    shownAt: 1_000_000 + seq * 30_000 + 1_500,
    groqMs: 900,
    segments: [{ seq, startMs: 0, endMs: 1, text: 'three short words' }],
    droppedCount: 0,
    ...overrides,
  }
}

describe('chunkMetrics', () => {
  it('measures lag from chunk end and from chunk start', () => {
    const m = chunkMetrics(row(1))
    expect(m.lagEndMs).toBe(1_500)
    expect(m.lagSpeechMs).toBe(31_500)
    expect(m.roundTripMs).toBe(1_400)
    expect(m.words).toBe(3)
  })

  it('has no lag until the transcript is shown', () => {
    const m = chunkMetrics(row(1, { status: 'recorded', shownAt: undefined }))
    expect(m.lagEndMs).toBeNull()
    expect(m.lagSpeechMs).toBeNull()
  })
})

describe('percentile', () => {
  it('uses nearest rank', () => {
    const values = Array.from({ length: 20 }, (_, i) => i + 1)
    expect(percentile(values, 0.5)).toBe(10)
    expect(percentile(values, 0.95)).toBe(19)
    expect(percentile([7], 0.95)).toBe(7)
    expect(percentile([], 0.5)).toBeNull()
  })
})

describe('summarize', () => {
  it('counts statuses, cut reasons and the forced-cut share', () => {
    const summary = summarize([
      row(1),
      row(2, { reason: 'force' }),
      row(3),
      row(4, { reason: 'pause', status: 'silent', shownAt: undefined }),
      row(5, { status: 'recorded', shownAt: undefined }),
      row(6, { reason: 'stop', status: 'failed', shownAt: undefined }),
    ])
    expect(summary).toMatchObject({
      chunks: 6,
      transcribed: 3,
      silent: 1,
      failed: 1,
      pending: 1,
      recordedMs: 180_000,
      cuts: { silence: 3, force: 1, pause: 1, stop: 1 },
      forceCutShare: 0.25,
      lagEndP50: 1_500,
      lagSpeechP95: 31_500,
    })
  })

  it('handles an empty session', () => {
    expect(summarize([])).toMatchObject({ chunks: 0, forceCutShare: null, lagSpeechP95: null })
  })
})

describe('clockTime', () => {
  it('formats minutes and hours', () => {
    expect(clockTime(0)).toBe('00:00')
    expect(clockTime(65_400)).toBe('01:05')
    expect(clockTime(3 * 3_600_000 + 61_000)).toBe('3:01:01')
  })
})
