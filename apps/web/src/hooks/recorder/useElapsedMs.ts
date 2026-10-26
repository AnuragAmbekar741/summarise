import { useEffect, useReducer } from 'react';

import { useRecorder } from './useRecorder';

const TICK_MS = 500;

// The active recording's time, re-rendering while it runs so a clock can
// show it. Frozen while paused.
export function useElapsedMs() {
  const { state, getElapsedMs } = useRecorder();
  const [, tick] = useReducer((count: number) => count + 1, 0);

  useEffect(() => {
    if (state !== 'recording') return;
    const timer = setInterval(tick, TICK_MS);
    return () => clearInterval(timer);
  }, [state]);

  return getElapsedMs();
}
