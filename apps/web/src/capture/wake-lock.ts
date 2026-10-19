/**
 * Keeps the screen on while recording. The browser drops the lock whenever the
 * tab is hidden, so it is requested again each time the tab becomes visible.
 * Unsupported browsers or a refused request (battery saver) are not errors.
 */
export class ScreenWakeLock {
  private sentinel: WakeLockSentinel | null = null
  private wanted = false

  private readonly onVisibility = () => {
    if (this.wanted && document.visibilityState === 'visible') void this.request()
  }

  get supported(): boolean {
    return 'wakeLock' in navigator
  }

  get held(): boolean {
    return this.sentinel !== null && !this.sentinel.released
  }

  async acquire(): Promise<void> {
    this.wanted = true
    document.addEventListener('visibilitychange', this.onVisibility)
    await this.request()
  }

  async release(): Promise<void> {
    this.wanted = false
    document.removeEventListener('visibilitychange', this.onVisibility)
    await this.sentinel?.release()
    this.sentinel = null
  }

  private async request(): Promise<void> {
    if (!this.supported || this.held) return
    try {
      this.sentinel = await navigator.wakeLock.request('screen')
    } catch {
      this.sentinel = null
    }
  }
}
