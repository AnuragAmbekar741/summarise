import { describe, expect, it } from 'vitest'
import { SilenceCutter, type Decision } from './silence-cutter'

const STEP = 50
const SPEECH = -20
const QUIET = -55

/** Level stream: `level(t)` sampled every 50 ms from `from` to `to`. */
function feed(cutter: SilenceCutter, from: number, to: number, level: (t: number) => number) {
  const decisions: { t: number; decision: Decision }[] = []
  for (let t = from; t < to; t += STEP) {
    const decision = cutter.push({ t, db: level(t) })
    if (decision !== 'continue') {
      decisions.push({ t, decision })
      cutter.startChunk(t)
    }
  }
  return decisions
}

/** Speech with 150 ms gaps between words (too short to cut) plus given long pauses. */
function speechWithPauses(pauses: [number, number][]) {
  return (t: number) => {
    if (pauses.some(([a, b]) => t >= a && t < b)) return QUIET
    return t % 1000 < 850 ? SPEECH : QUIET
  }
}

describe('SilenceCutter', () => {
  it('cuts at the first long pause after 25 s', () => {
    const cutter = new SilenceCutter()
    cutter.startChunk(0)
    const decisions = feed(cutter, 0, 40_000, speechWithPauses([[27_000, 28_000]]))
    expect(decisions).toHaveLength(1)
    expect(decisions[0].decision).toBe('cut')
    // Cut inside the pause, at least 300 ms after silence began.
    expect(decisions[0].t).toBeGreaterThanOrEqual(27_000)
    expect(decisions[0].t).toBeLessThan(28_000)
  })

  it('ignores pauses before 25 s', () => {
    const cutter = new SilenceCutter()
    cutter.startChunk(0)
    const decisions = feed(cutter, 0, 30_000, speechWithPauses([[10_000, 12_000]]))
    expect(decisions).toEqual([])
  })

  it('does not cut on gaps between words', () => {
    const cutter = new SilenceCutter()
    cutter.startChunk(0)
    const decisions = feed(cutter, 0, 44_000, speechWithPauses([]))
    expect(decisions).toEqual([])
  })

  it('force-cuts continuous speech at 45 s', () => {
    const cutter = new SilenceCutter()
    cutter.startChunk(0)
    const decisions = feed(cutter, 0, 50_000, () => SPEECH)
    expect(decisions).toEqual([{ t: 45_000, decision: 'force_cut' }])
  })

  it('marks a chunk of silence after speech as silent', () => {
    const cutter = new SilenceCutter()
    cutter.startChunk(0)
    feed(cutter, 0, 60_000, speechWithPauses([]))
    cutter.startChunk(60_000)
    feed(cutter, 60_000, 104_000, () => QUIET) // a long break, under the 45 s cap
    expect(cutter.stats().silent).toBe(true)
  })

  it('still marks silence as silent ten minutes into a break', () => {
    const cutter = new SilenceCutter()
    cutter.startChunk(0)
    feed(cutter, 0, 60_000, speechWithPauses([]))
    const decisions = feed(cutter, 60_000, 660_000, () => QUIET)
    expect(decisions.length).toBeGreaterThan(10)
    expect(cutter.stats().silent).toBe(true)
  })

  it('uploads silence when no speech has been heard yet', () => {
    // No speech reference exists; the server-side phantom filters handle these chunks.
    const cutter = new SilenceCutter()
    cutter.startChunk(0)
    feed(cutter, 0, 20_000, () => QUIET)
    expect(cutter.stats().silent).toBe(false)
  })

  it('does not mark a chunk with speech as silent', () => {
    const cutter = new SilenceCutter()
    cutter.startChunk(0)
    feed(cutter, 0, 20_000, speechWithPauses([]))
    expect(cutter.stats().silent).toBe(false)
  })

  it('floor follows rising room noise, so cuts still happen', () => {
    const cutter = new SilenceCutter()
    cutter.startChunk(0)
    // Room noise rises from -55 to -40 dB over a minute; speech stays at -20.
    const noise = (t: number) => QUIET + (15 * Math.min(t, 60_000)) / 60_000
    const level = (t: number) => {
      const pause = t % 30_000 >= 27_000 && t % 30_000 < 28_000
      if (pause) return noise(t)
      return t % 1000 < 850 ? SPEECH : noise(t)
    }
    const decisions = feed(cutter, 0, 120_000, level)
    expect(decisions.length).toBeGreaterThanOrEqual(3)
    expect(decisions.every((d) => d.decision === 'cut')).toBe(true)
    expect(cutter.floorDb).toBeGreaterThan(-45)
  })

  it('still finds pauses when digital silence drags the floor to -100 dB', () => {
    // Measured in the browser: synthetic audio with exact-zero gaps set the
    // threshold to -94 dB, so -60 dB pauses between sentences never counted.
    const cutter = new SilenceCutter()
    cutter.startChunk(0)
    const level = (t: number) => {
      if (t < 5_000) return -100 // digital silence before speech starts
      if (t >= 31_000 && t < 31_500) return -60 // a sentence pause
      return t % 1000 < 850 ? SPEECH : -100
    }
    const decisions = feed(cutter, 0, 40_000, level)
    expect(decisions).toHaveLength(1)
    expect(decisions[0].decision).toBe('cut')
    expect(cutter.thresholdDb).toBeGreaterThan(-60)
  })

  it('keeps chunk stats per chunk', () => {
    const cutter = new SilenceCutter()
    cutter.startChunk(0)
    feed(cutter, 0, 1_000, () => SPEECH)
    cutter.startChunk(1_000)
    expect(cutter.stats()).toMatchObject({ startMs: 1_000, samples: 0 })
  })
})
