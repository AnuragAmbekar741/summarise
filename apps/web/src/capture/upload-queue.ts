/**
 * Uploads recorded chunks one at a time, lowest seq first, until stopped.
 *
 * Network errors, 5xx, 408 and 429 back off (2 s doubling to 60 s) and retry
 * the same chunk; a permanent 4xx marks the chunk failed so it cannot block the
 * queue. `wake()` interrupts any wait: a new chunk, or the browser coming online.
 */
import { HttpError, type ChunkResponse } from './api'
import type { CaptureDb, ChunkRow } from './db'

export type QueueState = {
  /** Chunks waiting or in flight. */
  pending: number
  lastError: string | null
  /** Wall-clock ms of the next retry while backing off, else null. */
  retryAt: number | null
}

type Options = {
  db: CaptureDb
  sessionId: string
  upload: (row: ChunkRow) => Promise<ChunkResponse>
  onTranscribed?: (row: ChunkRow) => void
  onState?: (state: QueueState) => void
  now?: () => number
  sleep?: (ms: number, wake: Promise<void>) => Promise<void>
  baseDelayMs?: number
  maxDelayMs?: number
}

const realSleep = (ms: number, wake: Promise<void>) =>
  Promise.race([new Promise<void>((resolve) => setTimeout(resolve, ms)), wake])

export class UploadQueue {
  private readonly options: Required<Omit<Options, 'onTranscribed' | 'onState'>> &
    Pick<Options, 'onTranscribed' | 'onState'>
  private running = false
  private failures = 0
  private wakeUp: () => void = () => {}
  private wakeSignal: Promise<void> = Promise.resolve()
  private loopDone: Promise<void> = Promise.resolve()
  private state: QueueState = { pending: 0, lastError: null, retryAt: null }

  constructor(options: Options) {
    this.options = {
      now: Date.now,
      sleep: realSleep,
      baseDelayMs: 2_000,
      maxDelayMs: 60_000,
      ...options,
    }
    this.resetSignal()
  }

  get current(): QueueState {
    return this.state
  }

  async start(): Promise<void> {
    if (this.running) return
    const { db, sessionId } = this.options
    // A tab that closed mid-upload leaves rows in 'uploading'; send them again.
    await db.chunks
      .where('[sessionId+status]')
      .equals([sessionId, 'uploading'])
      .modify({ status: 'recorded' })
    this.running = true
    this.loopDone = this.loop()
  }

  /** Stop after the current upload; pending chunks stay in IndexedDB. */
  async stop(): Promise<void> {
    this.running = false
    this.wake()
    await this.loopDone
  }

  wake(): void {
    this.wakeUp()
  }

  private resetSignal(): void {
    this.wakeSignal = new Promise((resolve) => (this.wakeUp = resolve))
  }

  private async loop(): Promise<void> {
    const { db, upload, now } = this.options
    while (this.running) {
      const next = await this.nextChunk()
      await this.publish()
      if (!next) {
        await this.waitForWake()
        continue
      }

      const sending = { status: 'uploading' as const, sentAt: now(), attempts: next.attempts + 1 }
      await db.chunks.update(next.id, sending)
      try {
        const result = await upload(next)
        const done: Partial<ChunkRow> = {
          status: 'transcribed',
          segments: result.segments,
          droppedCount: result.droppedCount,
          groqMs: result.groqLatencyMs,
          shownAt: now(),
          lastError: undefined,
        }
        await db.chunks.update(next.id, done)
        this.failures = 0
        this.state = { ...this.state, lastError: null, retryAt: null }
        this.options.onTranscribed?.({ ...next, ...sending, ...done })
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        if (error instanceof HttpError && error.permanent) {
          await db.chunks.update(next.id, { status: 'failed', lastError: message })
          this.state = { ...this.state, lastError: message, retryAt: null }
          continue
        }
        await db.chunks.update(next.id, { status: 'recorded', lastError: message })
        this.failures += 1
        const delay = Math.min(
          this.options.baseDelayMs * 2 ** (this.failures - 1),
          this.options.maxDelayMs,
        )
        this.state = { ...this.state, lastError: message, retryAt: now() + delay }
        await this.publish()
        await this.waitForWake(delay)
      }
    }
    await this.publish()
  }

  private async nextChunk(): Promise<ChunkRow | undefined> {
    const { db, sessionId } = this.options
    const waiting = await db.chunks
      .where('[sessionId+status]')
      .equals([sessionId, 'recorded'])
      .sortBy('seq')
    return waiting[0]
  }

  private async publish(): Promise<void> {
    const { db, sessionId } = this.options
    const pending = await db.chunks
      .where('[sessionId+status]')
      .anyOf([sessionId, 'recorded'], [sessionId, 'uploading'])
      .count()
    this.state = { ...this.state, pending }
    this.options.onState?.(this.state)
  }

  private async waitForWake(delayMs?: number): Promise<void> {
    const signal = this.wakeSignal
    if (delayMs === undefined) await signal
    else await this.options.sleep(delayMs, signal)
    this.resetSignal()
  }
}
