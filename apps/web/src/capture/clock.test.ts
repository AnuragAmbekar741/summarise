import { describe, expect, it } from 'vitest'
import { LectureClock } from './clock'

function fakeTime() {
  let t = 1_000
  return { now: () => t, advance: (ms: number) => (t += ms) }
}

describe('LectureClock', () => {
  it('is zero before start', () => {
    expect(new LectureClock(fakeTime().now).elapsedMs()).toBe(0)
  })

  it('counts time since start', () => {
    const time = fakeTime()
    const clock = new LectureClock(time.now)
    clock.start()
    time.advance(30_000)
    expect(clock.elapsedMs()).toBe(30_000)
  })

  it('stops during pause and continues after resume', () => {
    const time = fakeTime()
    const clock = new LectureClock(time.now)
    clock.start()
    time.advance(10_000)
    clock.pause()
    time.advance(60_000)
    expect(clock.elapsedMs()).toBe(10_000)
    expect(clock.paused).toBe(true)
    clock.resume()
    time.advance(5_000)
    expect(clock.elapsedMs()).toBe(15_000)
  })

  it('ignores repeated pause and resume', () => {
    const time = fakeTime()
    const clock = new LectureClock(time.now)
    clock.start()
    clock.pause()
    time.advance(1_000)
    clock.pause()
    clock.resume()
    clock.resume()
    time.advance(1_000)
    expect(clock.elapsedMs()).toBe(1_000)
  })

  it('refuses a second start', () => {
    const clock = new LectureClock(fakeTime().now)
    clock.start()
    expect(() => clock.start()).toThrow()
  })
})
