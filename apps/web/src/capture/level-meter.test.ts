import { describe, expect, it } from 'vitest'
import { MIN_DB, toDb } from './level-meter'

describe('toDb', () => {
  it('maps full scale to 0 dB and half to about -6 dB', () => {
    expect(toDb(1)).toBe(0)
    expect(toDb(0.5)).toBeCloseTo(-6.02, 2)
  })

  it('floors silence at -100 dB', () => {
    expect(toDb(0)).toBe(MIN_DB)
    expect(toDb(1e-9)).toBe(MIN_DB)
  })
})
