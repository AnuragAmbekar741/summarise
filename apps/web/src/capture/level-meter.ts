/**
 * Microphone level in dBFS, every `intervalMs`.
 *
 * RMS is computed in an AudioWorklet on the audio thread, which background-tab
 * timer throttling does not touch; the worklet posts one value per interval.
 */

const PROCESSOR = `
class LevelProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super()
    this.window = Math.round((sampleRate * options.processorOptions.intervalMs) / 1000)
    this.sum = 0
    this.count = 0
  }
  process(inputs) {
    const channel = inputs[0] && inputs[0][0]
    if (channel) {
      for (let i = 0; i < channel.length; i++) this.sum += channel[i] * channel[i]
      this.count += channel.length
    } else {
      this.count += 128
    }
    if (this.count >= this.window) {
      this.port.postMessage(Math.sqrt(this.sum / this.count))
      this.sum = 0
      this.count = 0
    }
    return true
  }
}
registerProcessor('level-processor', LevelProcessor)
`

export const MIN_DB = -100

export function toDb(rms: number): number {
  return rms > 0 ? Math.max(MIN_DB, 20 * Math.log10(rms)) : MIN_DB
}

export class LevelMeter {
  private readonly stream: MediaStream
  private readonly intervalMs: number
  private context: AudioContext | null = null

  constructor(stream: MediaStream, intervalMs = 50) {
    this.stream = stream
    this.intervalMs = intervalMs
  }

  async start(onLevel: (db: number) => void): Promise<void> {
    const context = new AudioContext()
    this.context = context
    const url = URL.createObjectURL(new Blob([PROCESSOR], { type: 'text/javascript' }))
    try {
      await context.audioWorklet.addModule(url)
    } finally {
      URL.revokeObjectURL(url)
    }

    const source = context.createMediaStreamSource(this.stream)
    const node = new AudioWorkletNode(context, 'level-processor', {
      processorOptions: { intervalMs: this.intervalMs },
    })
    node.port.onmessage = (event: MessageEvent<number>) => onLevel(toDb(event.data))

    // A muted path to the destination keeps the graph pulling audio through the node.
    const mute = context.createGain()
    mute.gain.value = 0
    source.connect(node).connect(mute).connect(context.destination)
    await context.resume()
  }

  async stop(): Promise<void> {
    await this.context?.close()
    this.context = null
  }
}
