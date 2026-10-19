import { useEffect, useState } from 'react'
import { LevelMeter, MIN_DB } from '../capture/level-meter'
import { MIC_CONSTRAINTS } from '../capture/session'
import { micErrorMessage } from './use-audio-inputs'

/** Live level of the selected input before recording, for the setup check. */
export function useMicPreview(deviceId: string | undefined, enabled: boolean) {
  const [db, setDb] = useState(MIN_DB)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled) return
    let latest = MIN_DB
    let stream: MediaStream | null = null
    let meter: LevelMeter | null = null
    let cancelled = false
    const tick = setInterval(() => setDb(latest), 100)

    navigator.mediaDevices
      .getUserMedia({ audio: { ...MIC_CONSTRAINTS, deviceId: deviceId ? { exact: deviceId } : undefined } })
      .then(async (s) => {
        if (cancelled) return s.getTracks().forEach((t) => t.stop())
        stream = s
        meter = new LevelMeter(s)
        await meter.start((value) => (latest = value))
        setError(null)
      })
      .catch((e: unknown) => setError(micErrorMessage(e)))

    return () => {
      cancelled = true
      clearInterval(tick)
      void meter?.stop()
      stream?.getTracks().forEach((t) => t.stop())
      setDb(MIN_DB)
    }
  }, [deviceId, enabled])

  return { db, error }
}
