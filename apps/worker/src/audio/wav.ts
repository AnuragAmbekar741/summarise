const HEADER_BYTES = 44;

// 16-bit mono PCM samples → a .wav file. Assumes a little-endian machine
// (x86 and ARM both are), so the samples' bytes are already in WAV order.
export function toWav(samples: Int16Array, sampleRate: number): Buffer {
  const dataBytes = samples.byteLength;
  const header = Buffer.alloc(HEADER_BYTES);
  header.write('RIFF', 0, 'ascii');
  header.writeUInt32LE(HEADER_BYTES - 8 + dataBytes, 4);
  header.write('WAVE', 8, 'ascii');
  header.write('fmt ', 12, 'ascii');
  header.writeUInt32LE(16, 16); // size of this fmt block
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28); // bytes per second
  header.writeUInt16LE(2, 32); // bytes per sample
  header.writeUInt16LE(16, 34); // bits per sample
  header.write('data', 36, 'ascii');
  header.writeUInt32LE(dataBytes, 40);
  return Buffer.concat([
    header,
    Buffer.from(samples.buffer, samples.byteOffset, dataBytes),
  ]);
}
