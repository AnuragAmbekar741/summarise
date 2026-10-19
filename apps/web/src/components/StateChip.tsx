import { stateLabel, type StateLabelInput } from '../lib/state-label'

const TONES = {
  ok: 'bg-emerald-100 text-emerald-800',
  busy: 'bg-amber-100 text-amber-800',
  warn: 'bg-red-100 text-red-800',
  idle: 'bg-neutral-100 text-neutral-700',
}

export function StateChip(props: StateLabelInput) {
  const { text, tone } = stateLabel(props)
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${TONES[tone]}`} role="status">
      {text}
    </span>
  )
}
