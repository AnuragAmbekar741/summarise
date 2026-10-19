/**
 * Decides where to cut the recording into chunks, using only level samples.
 *
 * Noise floor = a low percentile of the last 30 s of levels. Speech level = a high
 * percentile of the same window, held as a peak that decays slowly, so a long
 * break still has a speech reference. A sample is silent when it is under
 * floor + margin and at least `minContrastDb` under the speech level, so
 * nonstop speech never reads as silence. The threshold never sinks more than
 * `maxContrastDb` under speech: stretches of digital silence (-100 dB) would
 * otherwise drag the floor down until real pauses no longer count.
 *
 * After `minChunkMs`, the chunk is cut at the end of the first silent run of
 * `silenceWindowMs`; at `maxChunkMs` it is cut regardless. Cutting in silence means no word is split, so chunks need no overlap.
 *
 * Pure: no browser APIs, so it is unit-tested with synthetic level streams.
 */

export type CutterConfig = {
  minChunkMs: number
  maxChunkMs: number
  silenceWindowMs: number
  floorWindowMs: number
  floorPercentile: number
  marginDb: number
  speechPercentile: number
  minContrastDb: number
  maxContrastDb: number
  speechDecayDbPerSec: number
  silentShare: number
}

export const DEFAULT_CUTTER: CutterConfig = {
  minChunkMs: 25_000,
  maxChunkMs: 45_000,
  silenceWindowMs: 300,
  floorWindowMs: 30_000,
  floorPercentile: 0.1,
  marginDb: 6,
  speechPercentile: 0.9,
  minContrastDb: 10,
  maxContrastDb: 35,
  speechDecayDbPerSec: 1 / 30,
  silentShare: 0.95,
}

/** A level reading: `t` in ms on the lecture clock, `db` in dBFS. */
export type Sample = { t: number; db: number }

export type Decision = 'continue' | 'cut' | 'force_cut'

export type ChunkStats = {
  startMs: number
  samples: number
  silentSamples: number
  /** True when the chunk is almost all silence and should not be uploaded. */
  silent: boolean
}

export class SilenceCutter {
  readonly config: CutterConfig
  private history: Sample[] = []
  private chunkStart = 0
  private samples = 0
  private silentSamples = 0
  private silenceSince: number | null = null
  private floor = -100
  private speech = -100
  private lastT: number | null = null

  constructor(config: Partial<CutterConfig> = {}) {
    this.config = { ...DEFAULT_CUTTER, ...config }
  }

  get floorDb(): number {
    return this.floor
  }

  get thresholdDb(): number {
    const { marginDb, minContrastDb, maxContrastDb } = this.config
    const fromFloor = Math.max(this.floor + marginDb, this.speech - maxContrastDb)
    return Math.min(fromFloor, this.speech - minContrastDb)
  }

  /** Begin a new chunk at `t`. The noise-floor history is kept across chunks. */
  startChunk(t: number): void {
    this.chunkStart = t
    this.samples = 0
    this.silentSamples = 0
    this.silenceSince = null
  }

  stats(): ChunkStats {
    const share = this.samples ? this.silentSamples / this.samples : 1
    return {
      startMs: this.chunkStart,
      samples: this.samples,
      silentSamples: this.silentSamples,
      silent: share >= this.config.silentShare,
    }
  }

  push(sample: Sample): Decision {
    this.remember(sample)

    const isSilent = sample.db < this.thresholdDb
    this.samples += 1
    if (isSilent) {
      this.silentSamples += 1
      this.silenceSince ??= sample.t
    } else {
      this.silenceSince = null
    }

    const age = sample.t - this.chunkStart
    if (age >= this.config.maxChunkMs) return 'force_cut'
    if (
      age >= this.config.minChunkMs &&
      this.silenceSince !== null &&
      sample.t - this.silenceSince >= this.config.silenceWindowMs
    ) {
      return 'cut'
    }
    return 'continue'
  }

  private remember(sample: Sample): void {
    this.history.push(sample)
    const oldest = sample.t - this.config.floorWindowMs
    let drop = 0
    while (drop < this.history.length && this.history[drop].t < oldest) drop += 1
    if (drop) this.history.splice(0, drop)

    const levels = this.history.map((s) => s.db).sort((a, b) => a - b)
    const at = (p: number) => levels[Math.floor((levels.length - 1) * p)]
    this.floor = at(this.config.floorPercentile)
    const elapsed = this.lastT === null ? 0 : (sample.t - this.lastT) / 1000
    const decayed = this.speech - this.config.speechDecayDbPerSec * elapsed
    this.speech = Math.max(at(this.config.speechPercentile), decayed)
    this.lastT = sample.t
  }
}
