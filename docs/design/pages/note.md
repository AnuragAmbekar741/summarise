# Note

One note: its live transcript on the left and its AI notes on the right. While
recording, the header holds the recording controls; otherwise a status chip.
The title and description are edited in place.

**Route:** `/notes/:noteId`
**Source:** `apps/web/src/pages/note/NotePage.tsx`

## Layout

- **Header**, full width, no line below: back chevron, then the title, the
  description and the date. The recording pill or status chip sits on the
  right and wraps below on narrow screens.
- **Two panes** filling the rest of the viewport, split 50/50. The transcript
  sits on the canvas; the notes are a raised card. Each pane scrolls on its
  own. On mobile (below `lg`) they stack: transcript first, notes below.

## Components

| Component                                            | Variant                              | Where      |
| ---------------------------------------------------- | ------------------------------------ | ---------- |
| [`EditableText`](../components/editable-text.md)     | Title (`h1`), description            | Header     |
| [`RecordingPill`](../components/recording-pill.md)   | `recording` / `paused` / `finishing` | Header     |
| [`StatusChip`](../components/status-chip.md)         | `ready` / `elsewhere`                | Header     |
| [`TranscriptPane`](../components/transcript-pane.md) | Follows the page state               | Left pane  |
| [`NotesPane`](../components/notes-pane.md)           | —                                    | Right pane |

## Typography & spacing

| Piece       | Token                                              | Spacing                                |
| ----------- | -------------------------------------------------- | -------------------------------------- |
| Title       | `{typography.display-md}` (`display-sm` on mobile) | —                                      |
| Description | `{typography.body-md}`, body, max 640px            | 8px below the title                    |
| Subtitle    | `{typography.caption}`, muted                      | 4px below the description              |
| Header      | —                                                  | 20px vertical, 32px side (16px mobile) |
| Panes       | —                                                  | 48px padding (16px / 32px on mobile)   |

## Atmosphere

Only the notes pane has orbs; see [`NotesPane`](../components/notes-pane.md).

## Copy

- Description placeholder: "Add a description"
- Subtitle: "Sun, Oct 25 · 10:02am", plus " · 42 min" once ready
- Back link label (screen readers): "Back to notes"

## States

The page state comes from the service's note status and this browser's
recorder:

| State       | When                                               | Header           | Notes card |
| ----------- | -------------------------------------------------- | ---------------- | ---------- |
| `recording` | This tab is recording the note                     | Pill `recording` | Disabled   |
| `paused`    | Paused, or cut off by a reload (Resume carries on) | Pill `paused`    | Disabled   |
| `finishing` | Stop clicked, last chunks still arriving           | Pill `finishing` | Disabled   |
| `ready`     | Every chunk is transcribed                         | Chip `ready`     | Enabled    |
| `elsewhere` | Recording in another browser                       | Chip `elsewhere` | Disabled   |

- **Editing:** double-click the title or description (or use the hover
  pencil) and type in place. Enter or clicking away saves, Esc cancels. A
  failed save puts the old text back and shows a toast.
- **Loading:** nothing renders until the note has loaded.
- **Not found:** "This note doesn't exist." with a "Back to notes" link.
- **Error:** "Couldn't load this note. Please try again."
- **Microphone errors** show as a toast: "Allow microphone access to record."
  or "No microphone found."
