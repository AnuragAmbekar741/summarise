/**
 * Session export: a JSON report of every chunk's timings, and a zip of the
 * browser's own audio copy (chunk files + report) for re-running the eval.
 */
import { strToU8, zipSync } from 'fflate'
import { audioExtension } from './audio-file'
import type { ChunkRow, SessionRow } from './db'
import { chunkMetrics, summarize } from './metrics'

export type SessionReport = {
  exportedAt: string
  session: Omit<SessionRow, 'vocabulary'> & { vocabularySize: number }
  userAgent: string
  summary: ReturnType<typeof summarize>
  chunks: ReturnType<typeof chunkMetrics>[]
  transcript: { seq: number; startMs: number; endMs: number; text: string }[]
}

export function sessionReport(
  session: SessionRow,
  rows: ChunkRow[],
  userAgent: string = navigator.userAgent,
): SessionReport {
  const ordered = [...rows].sort((a, b) => a.seq - b.seq)
  const { vocabulary, ...rest } = session
  return {
    exportedAt: new Date().toISOString(),
    session: { ...rest, vocabularySize: vocabulary.length },
    userAgent,
    summary: summarize(ordered),
    chunks: ordered.map(chunkMetrics),
    transcript: ordered.flatMap((r) => r.segments),
  }
}

export function chunkFileName(row: ChunkRow): string {
  return `${String(row.seq).padStart(5, '0')}.${audioExtension(row.mime)}`
}

/** Zip of every non-empty chunk plus `session.json`. Audio is stored, not recompressed. */
export async function audioZip(report: SessionReport, rows: ChunkRow[]): Promise<Blob> {
  const files: Record<string, Uint8Array> = {
    'session.json': strToU8(JSON.stringify(report, null, 2)),
  }
  for (const row of rows) {
    if (row.bytes > 0) files[chunkFileName(row)] = new Uint8Array(await row.blob.arrayBuffer())
  }
  const zipped = zipSync(files, { level: 0 })
  return new Blob([zipped.buffer as ArrayBuffer], { type: 'application/zip' })
}

export function download(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1_000)
}
