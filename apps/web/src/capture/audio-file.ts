/** File extension for a recorded chunk's MIME type, shared by uploads and exports. */
const EXTENSIONS: Record<string, string> = { webm: 'webm', ogg: 'ogg', mp4: 'm4a' }

export function audioExtension(mime: string): string {
  const subtype = mime.split(';')[0].split('/')[1] ?? 'webm'
  return EXTENSIONS[subtype] ?? subtype
}
