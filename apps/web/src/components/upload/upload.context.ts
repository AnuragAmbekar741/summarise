import { createContext } from 'react';

export type UploadsContextValue = {
  // How far along (0 to 1) each note this tab is uploading is.
  progress: Record<string, number>;
  // Creates the note and uploads the file in the background. Failures show
  // as a toast.
  start: (file: File) => Promise<void>;
  // Stops sending a note's file, quietly. Called before the note is deleted,
  // so the file never lands in the bucket after the note is gone.
  cancel: (noteId: string) => void;
};

export const UploadsContext = createContext<UploadsContextValue | null>(null);
