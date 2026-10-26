const pad = (value: number) => String(value).padStart(2, '0');

// 2559000 → "00:42:39", for a running clock.
export function formatClock(ms: number) {
  const seconds = Math.floor(ms / 1000);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds % 60)}`;
}

// 2220000 → "37:00", or "1:02:00" past an hour, for transcript lines.
export function formatTimestamp(ms: number) {
  const seconds = Math.floor(ms / 1000);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = `${pad(minutes)}:${pad(seconds % 60)}`;
  return hours > 0 ? `${hours}:${rest}` : rest;
}

// 4500000 → "1 h 15 min".
export function formatDuration(ms: number) {
  const minutes = Math.round(ms / 60_000);
  // Lowercase: it always follows a "·" mid-line.
  if (minutes < 1) return 'under a minute';
  const hours = Math.floor(minutes / 60);
  if (hours === 0) return `${minutes} min`;
  return minutes % 60 === 0 ? `${hours} h` : `${hours} h ${minutes % 60} min`;
}

// "Sun, Oct 25".
export function formatDay(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

// "10:02am".
export function formatTime(iso: string) {
  return new Date(iso)
    .toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    .replace(' ', '')
    .toLowerCase();
}

// "Sun, Oct 25 · 10:02am".
export function formatNoteDate(iso: string) {
  return `${formatDay(iso)} · ${formatTime(iso)}`;
}
