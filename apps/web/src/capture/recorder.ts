/**
 * Records the stream as a series of complete audio files, one MediaRecorder per
 * chunk. A single recorder with a timeslice is not used: only its first blob
 * carries the container header, so later pieces cannot be transcribed alone.
 *
 * On a cut, the next recorder starts before the previous one stops. Cuts happen
 * in silence, so the few milliseconds of overlap are harmless and nothing is lost.
 */

export const MIME_PREFERENCE = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4']
export const BITS_PER_SECOND = 32_000

export type CutReason = 'silence' | 'force' | 'pause' | 'stop'

export type RecordedChunk = {
  seq: number
  /** Lecture-clock ms where the chunk starts. */
  startMs: number
  durationMs: number
  /** Wall-clock ms (Date.now) when the chunk ended; used to measure lag. */
  endedAt: number
  reason: CutReason
  blob: Blob
  mime: string
}

export type RecorderLike = {
  start(): void
  stop(): void
  ondataavailable: ((event: { data: Blob }) => void) | null
  onstop: (() => void) | null
  onerror: ((event: { error?: unknown }) => void) | null
}

export type MakeRecorder = (
  stream: MediaStream,
  options: { mimeType: string; audioBitsPerSecond: number },
) => RecorderLike

const browserRecorder: MakeRecorder = (stream, options) =>
  new MediaRecorder(stream, options) as unknown as RecorderLike

export function pickMime(
  isSupported: (type: string) => boolean = (t) => MediaRecorder.isTypeSupported(t),
): string | null {
  return MIME_PREFERENCE.find(isSupported) ?? null
}

type Active = { recorder: RecorderLike; seq: number; startMs: number; parts: Blob[] }

export class ChunkRecorder {
  private readonly stream: MediaStream
  private readonly mime: string
  private readonly onChunk: (chunk: RecordedChunk) => void
  private readonly onError: (error: Error) => void
  private readonly make: MakeRecorder
  private readonly now: () => number
  private current: Active | null = null
  private seq: number

  constructor(
    stream: MediaStream,
    mime: string,
    onChunk: (chunk: RecordedChunk) => void,
    options: {
      firstSeq?: number
      make?: MakeRecorder
      now?: () => number
      /** A MediaRecorder error, or a start that threw (for example after the track ended). */
      onError?: (error: Error) => void
    } = {},
  ) {
    this.stream = stream
    this.mime = mime
    this.onChunk = onChunk
    this.onError = options.onError ?? (() => {})
    this.make = options.make ?? browserRecorder
    this.now = options.now ?? Date.now
    this.seq = options.firstSeq ?? 1
  }

  get recording(): boolean {
    return this.current !== null
  }

  /** Seq the next chunk will get. */
  get nextSeq(): number {
    return this.seq
  }

  start(atMs: number): void {
    if (this.current) throw new Error('already recording')
    this.current = this.begin(atMs)
  }

  /** End the current chunk at `atMs` and continue in a new one. */
  cut(atMs: number, reason: CutReason): void {
    const previous = this.current
    if (!previous) return
    let next: Active | null = null
    try {
      next = this.begin(atMs)
    } catch (error) {
      // The stream is unusable (device gone); keep what was recorded so far.
      this.current = null
      this.finish(previous, atMs, 'stop')
      this.onError(error instanceof Error ? error : new Error(String(error)))
      return
    }
    this.current = next
    this.finish(previous, atMs, reason)
  }

  /** End the current chunk and stop recording (pause or stop). */
  stop(atMs: number, reason: CutReason): void {
    const previous = this.current
    if (!previous) return
    this.current = null
    this.finish(previous, atMs, reason)
  }

  private begin(atMs: number): Active {
    const recorder = this.make(this.stream, {
      mimeType: this.mime,
      audioBitsPerSecond: BITS_PER_SECOND,
    })
    const active: Active = { recorder, seq: this.seq, startMs: atMs, parts: [] }
    this.seq += 1
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) active.parts.push(event.data)
    }
    recorder.onerror = (event) => {
      const cause = event.error
      this.onError(cause instanceof Error ? cause : new Error('recording failed'))
    }
    recorder.start()
    return active
  }

  private finish(active: Active, atMs: number, reason: CutReason): void {
    const endedAt = this.now()
    active.recorder.onstop = () =>
      this.onChunk({
        seq: active.seq,
        startMs: active.startMs,
        durationMs: Math.max(0, atMs - active.startMs),
        endedAt,
        reason,
        blob: new Blob(active.parts, { type: this.mime }),
        mime: this.mime,
      })
    try {
      active.recorder.stop()
    } catch {
      // Already inactive (the track ended): deliver whatever was captured.
      active.recorder.onstop()
    }
  }
}
