/**
 * Lecture time: milliseconds since Start, not counting paused time.
 * Chunk offsets and transcript timestamps use this clock.
 */
export class LectureClock {
  private readonly now: () => number
  private startedAt: number | null = null
  private pausedAt: number | null = null
  private pausedTotal = 0

  constructor(now: () => number = () => performance.now()) {
    this.now = now
  }

  get running(): boolean {
    return this.startedAt !== null && this.pausedAt === null
  }

  get paused(): boolean {
    return this.pausedAt !== null
  }

  start(): void {
    if (this.startedAt !== null) throw new Error('clock already started')
    this.startedAt = this.now()
  }

  pause(): void {
    if (!this.running) return
    this.pausedAt = this.now()
  }

  resume(): void {
    if (this.pausedAt === null) return
    this.pausedTotal += this.now() - this.pausedAt
    this.pausedAt = null
  }

  elapsedMs(): number {
    if (this.startedAt === null) return 0
    const end = this.pausedAt ?? this.now()
    return Math.round(end - this.startedAt - this.pausedTotal)
  }
}
