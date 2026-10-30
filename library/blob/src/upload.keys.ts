// Where an uploaded file lives in the bucket until it has been transcribed.
// Shared by the service, which hands out its upload URL, and the worker.
export function uploadKey(noteId: string) {
  return `uploads/${noteId}/source`;
}
