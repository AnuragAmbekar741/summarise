import type { QueueState } from '../capture/upload-queue'
import type { CaptureStatus } from '../hooks/use-capture'

export type StateLabelInput = { status: CaptureStatus; queue: QueueState }
export type Tone = 'ok' | 'busy' | 'warn' | 'idle'

/** What the state chip says: recording state first, then upload health. */
export function stateLabel({ status, queue }: StateLabelInput): { text: string; tone: Tone } {
  const offline = queue.retryAt !== null
  if (status === 'recording' || status === 'paused') {
    if (offline) return { text: 'Offline, recording continues', tone: 'warn' }
    if (queue.pending > 2) return { text: `Catching up ${queue.pending}`, tone: 'busy' }
    return status === 'paused' ? { text: 'Paused', tone: 'idle' } : { text: 'Live', tone: 'ok' }
  }
  if (status === 'stopped') {
    if (offline) return { text: `Offline, ${queue.pending} chunks waiting`, tone: 'warn' }
    if (queue.pending) return { text: `Transcribing remaining ${queue.pending}`, tone: 'busy' }
    return { text: 'Done', tone: 'ok' }
  }
  if (status === 'starting') return { text: 'Starting', tone: 'busy' }
  return { text: 'Ready', tone: 'idle' }
}
