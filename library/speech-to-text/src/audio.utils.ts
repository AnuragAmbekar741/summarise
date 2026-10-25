// Audio types Groq can read, mapped to a file extension. Groq infers the
// format from the uploaded file's name.
const EXTENSIONS: Record<string, string> = {
  'audio/webm': 'webm',
  'audio/ogg': 'ogg',
  'audio/mp4': 'mp4',
  'audio/mpeg': 'mp3',
  'audio/wav': 'wav',
};

// "audio/webm;codecs=opus" → "webm". Undefined for unsupported types.
export function audioFileExtension(mimeType: string): string | undefined {
  const base = mimeType.split(';')[0]?.trim().toLowerCase() ?? '';
  return EXTENSIONS[base];
}
