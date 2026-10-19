import { useEffect, useState } from 'react'

type Health = 'checking' | 'ok' | 'down'

export default function App() {
  const [health, setHealth] = useState<Health>('checking')

  useEffect(() => {
    fetch('/health')
      .then((r) => setHealth(r.ok ? 'ok' : 'down'))
      .catch(() => setHealth('down'))
  }, [])

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-xl font-semibold">Summarise: stage 0 proof</h1>
      <p className="mt-2 text-sm text-neutral-600">
        API: <span data-testid="health">{health}</span>
      </p>
    </main>
  )
}
