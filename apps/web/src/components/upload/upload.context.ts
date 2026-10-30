import { createContext } from 'react';

export type UploadsContextValue = {
  // How far along (0 to 1) each note this tab is uploading is.
  progress: Record<string, number>;
  // Creates the note and uploads the file in the background. Failures show
  // as a toast.
  start: (file: File) => Promise<void>;
};

export const UploadsContext = createContext<UploadsContextValue | null>(null);
