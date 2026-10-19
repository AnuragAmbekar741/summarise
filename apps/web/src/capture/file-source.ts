/**
 * Dev tool: plays an audio file into a MediaStream so the whole pipeline can run
 * without a microphone, repeatably, on a known recording.
 */
export type FileSource = {
  stream: MediaStream
  durationMs: number
  play(): void
  close(): Promise<void>
}

export async function fileSource(file: Blob, audible = false): Promise<FileSource> {
  const context = new AudioContext()
  const buffer = await context.decodeAudioData(await file.arrayBuffer())
  const destination = context.createMediaStreamDestination()
  let source: AudioBufferSourceNode | null = null

  return {
    stream: destination.stream,
    durationMs: Math.round(buffer.duration * 1000),
    play() {
      source = context.createBufferSource()
      source.buffer = buffer
      source.connect(destination)
      if (audible) source.connect(context.destination)
      source.start()
      void context.resume()
    },
    async close() {
      source?.stop()
      await context.close()
    },
  }
}
