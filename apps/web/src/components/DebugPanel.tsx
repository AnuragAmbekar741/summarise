import { useEffect, useState } from 'react'
import type { ChunkRow } from '../capture/db'
import { chunkMetrics, summarize } from '../capture/metrics'
import type { QueueState } from '../capture/upload-queue'

type Props = { chunks: ChunkRow[]; queue: QueueState }

const seconds = (ms: number | null) => (ms === null ? '–' : (ms / 1000).toFixed(1))
const kb = (bytes: number) => (bytes / 1024).toFixed(0)

function useStorage(refreshKey: number) {
  const [estimate, setEstimate] = useState<StorageEstimate | null>(null)
  useEffect(() => {
    void navigator.storage?.estimate?.().then(setEstimate)
  }, [refreshKey])
  return estimate
}

export function DebugPanel({ chunks, queue }: Props) {
  const summary = summarize(chunks)
  const storage = useStorage(chunks.length)
  const stats: [string, string][] = [
    ['Chunks', `${summary.chunks} (${summary.transcribed} transcribed, ${summary.silent} silent, ${summary.failed} failed)`],
    ['Queue', `${queue.pending} pending${queue.lastError ? ` · last error: ${queue.lastError}` : ''}`],
    ['Cuts', `silence ${summary.cuts.silence} · force ${summary.cuts.force} · pause ${summary.cuts.pause} · stop ${summary.cuts.stop}`],
    ['Forced cuts', summary.forceCutShare === null ? '–' : `${Math.round(summary.forceCutShare * 100)}% (gate under 20%)`],
    ['Lag from chunk start', `p50 ${seconds(summary.lagSpeechP50)} s · p95 ${seconds(summary.lagSpeechP95)} s (gate p95 under 60 s)`],
    ['Lag from chunk end', `p50 ${seconds(summary.lagEndP50)} s · p95 ${seconds(summary.lagEndP95)} s`],
    ['Audio', `${seconds(summary.recordedMs)} s · ${kb(summary.bytes)} KB`],
    [
      'Browser storage',
      storage?.usage !== undefined && storage.quota !== undefined
        ? `${(storage.usage / 1e6).toFixed(1)} MB used of ${(storage.quota / 1e9).toFixed(1)} GB`
        : 'unknown',
    ],
  ]

  return (
    <details className="rounded border border-neutral-200 p-3 text-sm">
      <summary className="cursor-pointer font-medium">Debug</summary>
      <dl className="mt-3 grid grid-cols-[10rem_1fr] gap-x-3 gap-y-1">
        {stats.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-neutral-500">{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-left font-mono text-xs">
          <thead className="text-neutral-500">
            <tr>
              {['seq', 'start', 'dur s', 'cut', 'status', 'KB', 'tries', 'trip s', 'groq s', 'lag end s', 'lag start s', 'words', 'dropped'].map((h) => (
                <th key={h} className="py-1 pr-3 font-normal">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {chunks.map(chunkMetrics).map((m) => (
              <tr key={m.seq} className="border-t border-neutral-100" title={m.lastError ?? undefined}>
                <td className="py-0.5 pr-3">{m.seq}</td>
                <td className="pr-3">{seconds(m.startMs)}</td>
                <td className="pr-3">{seconds(m.durationMs)}</td>
                <td className="pr-3">{m.reason}</td>
                <td className="pr-3">{m.status}</td>
                <td className="pr-3">{kb(m.bytes)}</td>
                <td className="pr-3">{m.attempts}</td>
                <td className="pr-3">{seconds(m.roundTripMs)}</td>
                <td className="pr-3">{seconds(m.groqMs)}</td>
                <td className="pr-3">{seconds(m.lagEndMs)}</td>
                <td className="pr-3">{seconds(m.lagSpeechMs)}</td>
                <td className="pr-3">{m.words}</td>
                <td className="pr-3">{m.dropped}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  )
}
