import { useContext } from 'react';

import { UploadsContext } from '@/components/upload/upload.context';

// The tab's uploads: their progress, and a way to start one.
export function useUploads() {
  const uploads = useContext(UploadsContext);
  if (!uploads) throw new Error('useUploads needs an UploadsProvider');
  return uploads;
}
