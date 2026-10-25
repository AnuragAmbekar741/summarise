// Audio types the recorder can produce, mapped to a file extension.
// Providers infer the format from the file name, and blob keys reuse it.
const EXTENSIONS: Record<string, string> = {
  'audio/webm': 'webm',
  'audio/ogg': 'ogg',
  'audio/mp4': 'mp4',
  'audio/mpeg': 'mp3',
  'audio/wav': 'wav',
};

export const SUPPORTED_AUDIO_TYPES = Object.keys(EXTENSIONS);

// "audio/webm;codecs=opus" → "webm". Undefined for unsupported types.
export function audioFileExtension(mimeType: string): string | undefined {
  const base = mimeType.split(';')[0]?.trim().toLowerCase() ?? '';
  return EXTENSIONS[base];
}
