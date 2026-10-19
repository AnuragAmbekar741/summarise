const FLOOR_DB = -80

const toPercent = (db: number) => Math.min(100, Math.max(0, ((db - FLOOR_DB) / -FLOOR_DB) * 100))

type Props = {
  db: number
  /** Silence threshold from the cutter; marked on the bar while recording. */
  threshold?: number
}

export function LevelMeter({ db, threshold }: Props) {
  const tooQuiet = db > FLOOR_DB && db < -50
  return (
    <div className="space-y-1">
      <div
        className="relative h-3 w-full overflow-hidden rounded bg-neutral-200"
        role="meter"
        aria-label="Microphone level"
        aria-valuemin={FLOOR_DB}
        aria-valuemax={0}
        aria-valuenow={Math.round(db)}
      >
        <div className="h-full bg-emerald-500 transition-[width] duration-100" style={{ width: `${toPercent(db)}%` }} />
        {threshold !== undefined && threshold > FLOOR_DB && (
          <div
            className="absolute top-0 h-full w-0.5 bg-neutral-700"
            style={{ left: `${toPercent(threshold)}%` }}
            title={`Silence below ${Math.round(threshold)} dB`}
          />
        )}
      </div>
      <p className="text-xs text-neutral-500">
        {Math.round(db)} dB
        {threshold !== undefined && threshold > FLOOR_DB && <> · silence below {Math.round(threshold)} dB</>}
        {tooQuiet && <> · too quiet: move closer or use an external mic</>}
      </p>
    </div>
  )
}
