/**
 * One lecture recording: microphone -> level meter -> silence cutter -> chunk
 * recorder -> IndexedDB -> upload queue. Pages drive it with start, pause,
 * resume and stop, and render what its events report.
 */
import { createSession, sha256Hex, uploadChunk } from './api'
import { LectureClock } from './clock'
import { chunkId, openCaptureDb, type CaptureDb, type ChunkRow } from './db'
import { LevelMeter } from './level-meter'
import { ChunkRecorder, pickMime, type CutReason, type RecordedChunk } from './recorder'
import { SilenceCutter, type CutterConfig } from './silence-cutter'
import { UploadQueue, type QueueState } from './upload-queue'
import { ScreenWakeLock } from './wake-lock'

export type CaptureState = 'ready' | 'recording' | 'paused' | 'stopped'

export type CaptureEvents = {
  onLevel?: (db: number, thresholdDb: number) => void
  onCut?: (seq: number, reason: CutReason, silent: boolean) => void
  onChunk?: (row: ChunkRow) => void
  onTranscribed?: (row: ChunkRow) => void
  onQueue?: (state: QueueState) => void
  onState?: (state: CaptureState) => void
}

export type CaptureOptions = {
  label: string
  vocabulary: string[]
  deviceId?: string
  /** Use this stream instead of the microphone (tests, synthetic audio). */
  stream?: MediaStream
  cutter?: Partial<CutterConfig>
  db?: CaptureDb
  events?: CaptureEvents
}

export const MIC_CONSTRAINTS: MediaTrackConstraints = {
  channelCount: 1,
  echoCancellation: false, // clips distant speech
  noiseSuppression: true,
  autoGainControl: true,
}

export class CaptureSession {
  readonly sessionId: string
  readonly mime: string
  private readonly db: CaptureDb
  private readonly stream: MediaStream
  private readonly ownsStream: boolean
  private readonly events: CaptureEvents
  private readonly clock = new LectureClock()
  private readonly cutter: SilenceCutter
  private readonly meter: LevelMeter
  private readonly recorder: ChunkRecorder
  private readonly queue: UploadQueue
  private readonly wakeLock = new ScreenWakeLock()
  private readonly silentBySeq = new Map<number, boolean>()
  private stateValue: CaptureState = 'ready'

  private readonly onOnline = () => this.queue.wake()

  static async open(options: CaptureOptions): Promise<CaptureSession> {
    const mime = pickMime()
    if (!mime) throw new Error('This browser cannot record audio in a supported format')
    const stream =
      options.stream ??
      (await navigator.mediaDevices.getUserMedia({
        audio: { ...MIC_CONSTRAINTS, deviceId: options.deviceId ? { exact: options.deviceId } : undefined },
      }))
    const ownsStream = !options.stream
    try {
      const sessionId = await createSession(options.label, options.vocabulary)
      const db = options.db ?? openCaptureDb()
      await db.sessions.put({
        id: sessionId,
        label: options.label,
        vocabulary: options.vocabulary,
        startedAt: Date.now(),
        status: 'recording',
        mime,
      })
      await navigator.storage?.persist?.()
      return new CaptureSession(sessionId, mime, db, stream, ownsStream, options)
    } catch (error) {
      // The microphone was opened above; a failed API call must not leave it on.
      if (ownsStream) stream.getTracks().forEach((track) => track.stop())
      throw error
    }
  }

  private constructor(
    sessionId: string,
    mime: string,
    db: CaptureDb,
    stream: MediaStream,
    ownsStream: boolean,
    options: CaptureOptions,
  ) {
    this.sessionId = sessionId
    this.mime = mime
    this.db = db
    this.stream = stream
    this.ownsStream = ownsStream
    this.events = options.events ?? {}
    this.cutter = new SilenceCutter(options.cutter)
    this.meter = new LevelMeter(stream)
    this.recorder = new ChunkRecorder(stream, mime, (chunk) => void this.store(chunk))
    this.queue = new UploadQueue({
      db,
      sessionId,
      upload: (row) => uploadChunk(row),
      onTranscribed: (row) => this.events.onTranscribed?.(row),
      onState: (state) => this.events.onQueue?.(state),
    })
  }

  get state(): CaptureState {
    return this.stateValue
  }

  get thresholdDb(): number {
    return this.cutter.thresholdDb
  }

  elapsedMs(): number {
    return this.clock.elapsedMs()
  }

  async start(): Promise<void> {
    if (this.stateValue !== 'ready') return
    try {
      // The meter comes first: without level samples nothing would ever cut.
      await this.meter.start((db) => this.onLevel(db))
      this.clock.start()
      this.cutter.startChunk(0)
      this.recorder.start(0)
      this.setState('recording')
      await this.wakeLock.acquire()
      window.addEventListener('online', this.onOnline)
      await this.queue.start()
    } catch (error) {
      await this.release()
      throw error
    }
  }

  pause(): void {
    if (this.stateValue !== 'recording') return
    this.endChunk('pause')
    this.clock.pause()
    this.setState('paused')
    void this.db.sessions.update(this.sessionId, { status: 'paused' })
  }

  resume(): void {
    if (this.stateValue !== 'paused') return
    this.clock.resume()
    const t = this.clock.elapsedMs()
    this.cutter.startChunk(t)
    this.recorder.start(t)
    this.setState('recording')
    void this.db.sessions.update(this.sessionId, { status: 'recording' })
  }

  /** Stop recording. The queue keeps uploading until `close()`. */
  async stop(): Promise<void> {
    if (this.stateValue === 'stopped' || this.stateValue === 'ready') return
    if (this.stateValue === 'recording') this.endChunk('stop')
    this.clock.pause()
    this.setState('stopped')
    await this.release()
    await this.db.sessions.update(this.sessionId, { status: 'stopped' })
  }

  /** Give back the microphone, the audio graph and the wake lock. Safe to call twice. */
  private async release(): Promise<void> {
    window.removeEventListener('online', this.onOnline)
    await this.meter.stop()
    await this.wakeLock.release()
    if (this.ownsStream) this.stream.getTracks().forEach((track) => track.stop())
  }

  /** Stop the upload queue; anything still pending stays in IndexedDB. */
  async close(): Promise<void> {
    await this.release()
    await this.queue.stop()
  }

  private onLevel(db: number): void {
    this.events.onLevel?.(db, this.cutter.thresholdDb)
    if (this.stateValue !== 'recording') return
    const t = this.clock.elapsedMs()
    const decision = this.cutter.push({ t, db })
    if (decision === 'continue') return
    const reason: CutReason = decision === 'force_cut' ? 'force' : 'silence'
    const seq = this.recorder.nextSeq - 1
    const silent = this.cutter.stats().silent
    this.silentBySeq.set(seq, silent)
    this.recorder.cut(t, reason)
    this.cutter.startChunk(t)
    this.events.onCut?.(seq, reason, silent)
  }

  private endChunk(reason: CutReason): void {
    const seq = this.recorder.nextSeq - 1
    const silent = this.cutter.stats().silent
    this.silentBySeq.set(seq, silent)
    this.recorder.stop(this.clock.elapsedMs(), reason)
    this.events.onCut?.(seq, reason, silent)
  }

  private async store(chunk: RecordedChunk): Promise<void> {
    const silent = this.silentBySeq.get(chunk.seq) ?? false
    this.silentBySeq.delete(chunk.seq)
    const empty = chunk.blob.size === 0
    const row: ChunkRow = {
      id: chunkId(this.sessionId, chunk.seq),
      sessionId: this.sessionId,
      seq: chunk.seq,
      startMs: chunk.startMs,
      durationMs: chunk.durationMs,
      endedAt: chunk.endedAt,
      reason: chunk.reason,
      mime: chunk.mime,
      bytes: chunk.blob.size,
      sha256: empty ? '' : await sha256Hex(chunk.blob),
      blob: chunk.blob,
      status: empty ? 'failed' : silent ? 'silent' : 'recorded',
      attempts: 0,
      lastError: empty ? 'empty recording' : undefined,
      segments: [],
      droppedCount: 0,
    }
    await this.db.chunks.put(row)
    this.events.onChunk?.(row)
    this.queue.wake()
  }

  private setState(state: CaptureState): void {
    this.stateValue = state
    this.events.onState?.(state)
  }
}
