import { describe, expect, it } from 'vitest'
import { audioExtension } from './audio-file'

describe('audioExtension', () => {
  it('maps recorder MIME types to file extensions', () => {
    expect(audioExtension('audio/webm;codecs=opus')).toBe('webm')
    expect(audioExtension('audio/ogg;codecs=opus')).toBe('ogg')
    expect(audioExtension('audio/mp4')).toBe('m4a')
    expect(audioExtension('audio/flac')).toBe('flac')
  })
})
