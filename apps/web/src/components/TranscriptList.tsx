import { useEffect, useRef } from 'react'
import type { ChunkRow } from '../capture/db'
import { clockTime } from '../capture/metrics'

type Props = { chunks: ChunkRow[]; autoScroll: boolean }

export function TranscriptList({ chunks, autoScroll }: Props) {
  const end = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (autoScroll) end.current?.scrollIntoView({ block: 'end' })
  }, [chunks, autoScroll])

  const visible = chunks.filter((c) => c.status !== 'silent')
  if (!visible.length) {
    return <p className="text-sm text-neutral-500">The transcript appears here, about 30 seconds behind the speaker.</p>
  }

  return (
    <div className="space-y-1.5 text-sm">
      {visible.map((chunk) =>
        chunk.status === 'transcribed' ? (
          chunk.segments.map((s) => (
            <p key={`${chunk.seq}-${s.startMs}`} className="flex gap-3">
              <span className="w-14 shrink-0 font-mono text-xs leading-5 text-neutral-400">{clockTime(s.startMs)}</span>
              <span>{s.text}</span>
            </p>
          ))
        ) : (
          <p key={chunk.seq} className="flex gap-3 text-neutral-400">
            <span className="w-14 shrink-0 font-mono text-xs leading-5">{clockTime(chunk.startMs)}</span>
            <span className="italic">
              {chunk.status === 'failed'
                ? `Could not transcribe this part: ${chunk.lastError ?? 'unknown error'}`
                : `Transcribing ${clockTime(chunk.startMs)} to ${clockTime(chunk.startMs + chunk.durationMs)}…`}
            </span>
          </p>
        ),
      )}
      <div ref={end} />
    </div>
  )
}
