// A message for a failed Start or Resume, most often the mic being blocked.
export function recorderErrorMessage(error: unknown) {
  if (error instanceof DOMException && error.name === 'NotAllowedError') {
    return 'Allow microphone access to record.';
  }
  if (error instanceof DOMException && error.name === 'NotFoundError') {
    return 'No microphone found.';
  }
  return error instanceof Error
    ? error.message
    : 'Something went wrong. Please try again.';
}
