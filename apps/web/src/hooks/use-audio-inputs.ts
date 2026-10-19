import { useCallback, useEffect, useState } from 'react'

export type MicPermission = 'unknown' | 'granted' | 'denied'

/** Plain-language reason for a getUserMedia failure. */
export function micErrorMessage(error: unknown): string {
  const name = error instanceof DOMException ? error.name : ''
  if (name === 'NotAllowedError' || name === 'SecurityError')
    return 'Microphone blocked. Allow it from the address bar, then try again.'
  if (name === 'NotFoundError' || name === 'OverconstrainedError')
    return 'No microphone found. Plug one in or pick another input.'
  if (name === 'NotReadableError' || name === 'AbortError')
    return 'The microphone is in use by another app or was disconnected.'
  return error instanceof Error ? error.message : String(error)
}

export function useAudioInputs() {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [permission, setPermission] = useState<MicPermission>('unknown')
  const [error, setError] = useState<string | null>(null)

  const apply = useCallback((all: MediaDeviceInfo[]) => {
    const inputs = all.filter((d) => d.kind === 'audioinput')
    setDevices(inputs)
    // Labels are only visible once permission has been granted.
    if (inputs.some((d) => d.label)) setPermission('granted')
  }, [])

  const refresh = useCallback(
    () => navigator.mediaDevices.enumerateDevices().then(apply),
    [apply],
  )

  useEffect(() => {
    const onChange = () => void navigator.mediaDevices.enumerateDevices().then(apply)
    onChange()
    navigator.mediaDevices.addEventListener('devicechange', onChange)
    return () => navigator.mediaDevices.removeEventListener('devicechange', onChange)
  }, [apply])

  const requestAccess = useCallback(async () => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach((track) => track.stop())
      setPermission('granted')
      await refresh()
    } catch (e) {
      setPermission('denied')
      setError(micErrorMessage(e))
    }
  }, [refresh])

  return { devices, permission, error, requestAccess }
}
