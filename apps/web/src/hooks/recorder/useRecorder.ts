import { useContext } from 'react';

import { RecorderContext } from '@/components/recorder/recorder.context';

// The tab's recorder: what is recording, and the controls for it.
export function useRecorder() {
  const recorder = useContext(RecorderContext);
  if (!recorder) throw new Error('useRecorder needs a RecorderProvider');
  return recorder;
}
