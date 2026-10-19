import { describe, expect, it } from 'vitest'
import { stateLabel } from './state-label'

const queue = (pending = 0, retryAt: number | null = null) => ({ pending, lastError: null, retryAt })

describe('stateLabel', () => {
  it('says Live while recording with a short queue', () => {
    expect(stateLabel({ status: 'recording', queue: queue(1) })).toEqual({ text: 'Live', tone: 'ok' })
  })

  it('says catching up when more than two chunks wait', () => {
    expect(stateLabel({ status: 'recording', queue: queue(3) }).text).toBe('Catching up 3')
  })

  it('says offline while backing off, even when paused', () => {
    expect(stateLabel({ status: 'recording', queue: queue(2, 123) }).text).toBe('Offline, recording continues')
    expect(stateLabel({ status: 'paused', queue: queue(2, 123) }).tone).toBe('warn')
  })

  it('reports remaining work after stop', () => {
    expect(stateLabel({ status: 'stopped', queue: queue(2) }).text).toBe('Transcribing remaining 2')
    expect(stateLabel({ status: 'stopped', queue: queue(0) }).text).toBe('Done')
    expect(stateLabel({ status: 'stopped', queue: queue(4, 1) }).text).toBe('Offline, 4 chunks waiting')
  })
})
