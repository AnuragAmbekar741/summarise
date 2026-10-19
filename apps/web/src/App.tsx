import { useEffect, useRef, useState } from 'react'
import { audioZip, download, sessionReport } from './capture/export'
import { fileSource, type FileSource } from './capture/file-source'
import { clockTime } from './capture/metrics'
import { DebugPanel } from './components/DebugPanel'
import { LevelMeter } from './components/LevelMeter'
import { StateChip } from './components/StateChip'
import { TranscriptList } from './components/TranscriptList'
import { useAudioInputs } from './hooks/use-audio-inputs'
import { useCapture } from './hooks/use-capture'
import { useMicPreview } from './hooks/use-mic-preview'

type Source = 'mic' | 'file'

const parseVocabulary = (text: string) => [
  ...new Set(text.split(/[,\n]/).map((t) => t.trim()).filter(Boolean)),
]

const button =
  'rounded px-3 py-1.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40'

export default function App() {
  const inputs = useAudioInputs()
  const capture = useCapture()
  const [label, setLabel] = useState('')
  const [vocabularyText, setVocabularyText] = useState('')
  const [deviceId, setDeviceId] = useState<string>('')
  const [source, setSource] = useState<Source>('mic')
  const [file, setFile] = useState<File | null>(null)
  const [autoScroll, setAutoScroll] = useState(true)
  const fileRef = useRef<FileSource | null>(null)

  const idle = capture.status === 'idle'
  const active = capture.status === 'recording' || capture.status === 'paused'
  const preview = useMicPreview(
    deviceId || undefined,
    idle && source === 'mic' && inputs.permission === 'granted',
  )

  // Closing the tab while recording loses everything not yet in IndexedDB.
  useEffect(() => {
    if (!active) return
    const warn = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [active])

  const canStart =
    idle && (source === 'file' ? file !== null : inputs.permission === 'granted')

  async function start() {
    const vocabulary = parseVocabulary(vocabularyText)
    const name = label.trim() || `Lecture ${new Date().toLocaleString()}`
    if (source === 'file' && file) {
      const played = await fileSource(file)
      fileRef.current = played
      await capture.start({ label: name, vocabulary, stream: played.stream })
      played.play()
    } else {
      await capture.start({ label: name, vocabulary, deviceId: deviceId || undefined })
    }
  }

  async function stop() {
    await capture.stop()
    await fileRef.current?.close()
    fileRef.current = null
  }

  async function exportReport(withAudio: boolean) {
    const session = await capture.sessionRow()
    if (!session) return
    const report = sessionReport(session, capture.chunks)
    const stamp = new Date(session.startedAt).toISOString().slice(0, 16).replace(':', '')
    const base = `lecture-${stamp}-${session.id.slice(-6)}`
    if (withAudio) download(await audioZip(report, capture.chunks), `${base}.zip`)
    else download(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }), `${base}.json`)
  }

  const level = idle ? { db: preview.db, threshold: undefined } : capture.level
  const error = capture.error ?? inputs.error ?? (idle ? preview.error : null)

  return (
    <main className="mx-auto max-w-3xl space-y-5 p-4 sm:p-6">
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold">Lecture capture</h1>
        <StateChip status={capture.status} queue={capture.queue} />
        <span className="ml-auto font-mono text-lg tabular-nums">{clockTime(capture.elapsedMs)}</span>
      </header>

      {error && (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {error}
        </p>
      )}

      {idle && (
        <section className="space-y-3 rounded border border-neutral-200 p-4">
          <label className="block text-sm">
            <span className="text-neutral-600">Lecture</span>
            <input
              className="mt-1 w-full rounded border border-neutral-300 px-2 py-1.5"
              placeholder="CS 229, week 3"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span className="text-neutral-600">Course terms, comma or line separated (helps spelling)</span>
            <textarea
              className="mt-1 w-full rounded border border-neutral-300 px-2 py-1.5"
              rows={2}
              placeholder="precision, recall, F1 score"
              value={vocabularyText}
              onChange={(e) => setVocabularyText(e.target.value)}
            />
          </label>

          {import.meta.env.DEV && (
            <fieldset className="flex gap-4 text-sm">
              <legend className="sr-only">Audio source</legend>
              {(['mic', 'file'] as const).map((value) => (
                <label key={value} className="flex items-center gap-1.5">
                  <input type="radio" name="source" checked={source === value} onChange={() => setSource(value)} />
                  {value === 'mic' ? 'Microphone' : 'Audio file (dev)'}
                </label>
              ))}
            </fieldset>
          )}

          {source === 'mic' ? (
            inputs.permission === 'granted' ? (
              <label className="block text-sm">
                <span className="text-neutral-600">Microphone</span>
                <select
                  className="mt-1 w-full rounded border border-neutral-300 px-2 py-1.5"
                  value={deviceId}
                  onChange={(e) => setDeviceId(e.target.value)}
                >
                  <option value="">System default</option>
                  {inputs.devices
                    .filter((d) => d.deviceId && d.deviceId !== 'default')
                    .map((d) => (
                      <option key={d.deviceId} value={d.deviceId}>
                        {d.label || 'Unnamed input'}
                      </option>
                    ))}
                </select>
              </label>
            ) : (
              <button className={`${button} bg-neutral-900 text-white`} onClick={() => void inputs.requestAccess()}>
                Allow microphone
              </button>
            )
          ) : (
            <input
              type="file"
              accept="audio/*"
              className="block text-sm"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          )}
          <p className="text-xs text-neutral-500">
            Record only lectures you have permission to record. Keep this tab open and the laptop awake.
          </p>
        </section>
      )}

      <LevelMeter db={level.db} threshold={level.threshold} />

      <div className="flex flex-wrap gap-2">
        {idle || capture.status === 'starting' ? (
          <button
            className={`${button} bg-emerald-600 text-white`}
            disabled={!canStart}
            onClick={() => void start()}
          >
            {capture.status === 'starting' ? 'Starting…' : 'Start recording'}
          </button>
        ) : (
          <>
            {capture.status === 'recording' && (
              <button className={`${button} border border-neutral-300`} onClick={capture.pause}>
                Pause
              </button>
            )}
            {capture.status === 'paused' && (
              <button className={`${button} border border-neutral-300`} onClick={capture.resume}>
                Resume
              </button>
            )}
            {active && (
              <button className={`${button} bg-red-600 text-white`} onClick={() => void stop()}>
                Stop
              </button>
            )}
            {capture.status === 'stopped' && (
              <button className={`${button} border border-neutral-300`} onClick={capture.reset}>
                New lecture
              </button>
            )}
          </>
        )}
        <label className="ml-auto flex items-center gap-1.5 text-sm text-neutral-600">
          <input type="checkbox" checked={autoScroll} onChange={(e) => setAutoScroll(e.target.checked)} />
          Auto-scroll
        </label>
      </div>

      <section className="h-[50vh] overflow-y-auto rounded border border-neutral-200 p-3" aria-label="Transcript">
        <TranscriptList chunks={capture.chunks} autoScroll={autoScroll} />
      </section>

      {capture.sessionId && capture.chunks.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button className={`${button} border border-neutral-300`} onClick={() => void exportReport(false)}>
            Export report
          </button>
          <button className={`${button} border border-neutral-300`} onClick={() => void exportReport(true)}>
            Download audio
          </button>
        </div>
      )}

      <DebugPanel chunks={capture.chunks} queue={capture.queue} />
    </main>
  )
}
