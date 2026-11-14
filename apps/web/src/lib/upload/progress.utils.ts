import type { PublicTranscriptSegment } from '@summarise/contract';

import { formatTimestamp } from '@/lib/time.utils';

export type TranscriptionProgress = {
  // How much of the recording is transcribed, from its start.
  doneMs: number;
  // How long the recording is; null until the worker has measured it.
  totalMs: number | null;
  // 0 to 1, or null while the length is unknown.
  fraction: number | null;
};

// How far an upload's transcription has got: up to the end of the last
// saved piece. Pieces are saved in order, so there are no gaps before it.
export function transcriptionProgress(
  durationMs: number | null,
  segments: PublicTranscriptSegment[] | undefined,
): TranscriptionProgress {
  const doneMs = Math.max(0, ...(segments ?? []).map((s) => s.endMs ?? 0));
  const totalMs = durationMs && durationMs > 0 ? durationMs : null;
  return {
    doneMs,
    totalMs,
    fraction: totalMs === null ? null : Math.min(1, doneMs / totalMs),
  };
}

// "18:20 of 45:00", "0:18:20 of 1:00:00" (both in the same form), or
// "18:20 done" while the length is unknown.
export function progressLabel({ doneMs, totalMs }: TranscriptionProgress) {
  if (totalMs === null) return `${formatTimestamp(doneMs)} done`;
  const hours = totalMs >= 3_600_000;
  return `${formatTime(doneMs, hours)} of ${formatTime(totalMs, hours)}`;
}

function formatTime(ms: number, hours: boolean) {
  if (!hours) return formatTimestamp(ms);
  const seconds = Math.floor(ms / 1000);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${Math.floor(seconds / 3600)}:${pad(Math.floor((seconds % 3600) / 60))}:${pad(seconds % 60)}`;
}

// 0.42 → "42%".
export function percent(fraction: number) {
  return `${Math.floor(fraction * 100)}%`;
}
