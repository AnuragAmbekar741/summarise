import { describe, expect, it } from 'vitest'
import { ChunkRecorder, pickMime, type RecordedChunk, type RecorderLike } from './recorder'

/** Fake MediaRecorder: delivers one blob and fires onstop asynchronously, like the browser. */
function fakes() {
  const log: string[] = []
  let made = 0
  const make = () => {
    const id = ++made
    const recorder: RecorderLike = {
      ondataavailable: null,
      onstop: null,
      start: () => log.push(`start ${id}`),
      stop: () => {
        log.push(`stop ${id}`)
        queueMicrotask(() => {
          recorder.ondataavailable?.({ data: new Blob([`audio-${id}`]) })
          recorder.onstop?.()
        })
      },
    }
    return recorder
  }
  return { log, make }
}

const stream = {} as MediaStream
const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('ChunkRecorder', () => {
  it('starts the next recorder before stopping the previous one', async () => {
    const { log, make } = fakes()
    const chunks: RecordedChunk[] = []
    const recorder = new ChunkRecorder(stream, 'audio/webm', (c) => chunks.push(c), { make })

    recorder.start(0)
    recorder.cut(27_000, 'silence')
    await flush()

    expect(log).toEqual(['start 1', 'start 2', 'stop 1'])
    expect(chunks).toHaveLength(1)
    expect(chunks[0]).toMatchObject({ seq: 1, startMs: 0, durationMs: 27_000, reason: 'silence' })
    expect(await chunks[0].blob.text()).toBe('audio-1')
  })

  it('numbers chunks and keeps lecture offsets across pause and resume', async () => {
    const { make } = fakes()
    const chunks: RecordedChunk[] = []
    const recorder = new ChunkRecorder(stream, 'audio/webm', (c) => chunks.push(c), {
      make,
      now: () => 1_700_000_000_000,
    })

    recorder.start(0)
    recorder.cut(30_000, 'silence')
    recorder.stop(40_000, 'pause')
    expect(recorder.recording).toBe(false)
    recorder.start(40_000) // lecture clock does not advance while paused
    recorder.cut(85_000, 'force')
    recorder.stop(90_000, 'stop')
    await flush()

    expect(chunks.map((c) => [c.seq, c.startMs, c.durationMs, c.reason])).toEqual([
      [1, 0, 30_000, 'silence'],
      [2, 30_000, 10_000, 'pause'],
      [3, 40_000, 45_000, 'force'],
      [4, 85_000, 5_000, 'stop'],
    ])
    expect(chunks.every((c) => c.endedAt === 1_700_000_000_000)).toBe(true)
  })

  it('can continue numbering from a given seq', () => {
    const { make } = fakes()
    const recorder = new ChunkRecorder(stream, 'audio/webm', () => {}, { make, firstSeq: 12 })
    recorder.start(0)
    expect(recorder.nextSeq).toBe(13)
  })

  it('refuses to start twice', () => {
    const { make } = fakes()
    const recorder = new ChunkRecorder(stream, 'audio/webm', () => {}, { make })
    recorder.start(0)
    expect(() => recorder.start(1)).toThrow()
  })
})

describe('pickMime', () => {
  it('prefers webm opus, then ogg, then mp4', () => {
    expect(pickMime(() => true)).toBe('audio/webm;codecs=opus')
    expect(pickMime((t) => t !== 'audio/webm;codecs=opus')).toBe('audio/ogg;codecs=opus')
    expect(pickMime((t) => t === 'audio/mp4')).toBe('audio/mp4')
    expect(pickMime(() => false)).toBeNull()
  })
})
