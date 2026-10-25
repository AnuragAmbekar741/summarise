# Note

One note: its live transcript on the left and its AI notes on the right. While
recording, the header holds the recording controls.

**Route:** `/notes/:noteId`
**Source:** `apps/web/src/pages/note/NotePage.tsx`

## Layout

- **Header**, full width, hairline below: back chevron, then the title with the
  date under it. The recording pill sits on the right and wraps below on
  narrow screens.
- **Two panes** filling the rest of the viewport, split 50/50 by a hairline.
  Each pane scrolls on its own. On mobile (below `lg`) they stack: transcript
  first, notes below, divided by a hairline.

## Components

| Component                                            | Variant                              | Where      |
| ---------------------------------------------------- | ------------------------------------ | ---------- |
| [`RecordingPill`](../components/recording-pill.md)   | `recording` / `paused` / `finishing` | Header     |
| [`TranscriptPane`](../components/transcript-pane.md) | Follows the page state               | Left pane  |
| [`NotesPane`](../components/notes-pane.md)           | —                                    | Right pane |

## Typography & spacing

| Piece    | Token                                              | Spacing                                |
| -------- | -------------------------------------------------- | -------------------------------------- |
| Title    | `{typography.display-md}` (`display-sm` on mobile) | —                                      |
| Subtitle | `{typography.caption}`, muted                      | 4px below the title                    |
| Header   | —                                                  | 20px vertical, 32px side (16px mobile) |
| Panes    | —                                                  | 48px padding (16px / 32px on mobile)   |

## Atmosphere

Only the notes pane has orbs; see [`NotesPane`](../components/notes-pane.md).

## Copy

- Subtitle: "Sun, Oct 25 · 10:02am", plus " · 42 min" once ready
- Back link label (screen readers): "Back to notes"

## States

The page state comes from the service's note status and this browser's
recorder:

| State       | When                                               | Header pill |
| ----------- | -------------------------------------------------- | ----------- |
| `recording` | This tab is recording the note                     | `recording` |
| `paused`    | Paused, or cut off by a reload (Resume carries on) | `paused`    |
| `finishing` | Stop clicked, last chunks still arriving           | `finishing` |
| `ready`     | Every chunk is transcribed                         | none        |
| `elsewhere` | Recording in another browser                       | none        |

- **Loading:** nothing renders until the note has loaded.
- **Not found:** "This note doesn't exist." with a "Back to notes" link.
- **Error:** "Couldn't load this note. Please try again."
- **Microphone errors** show as a toast: "Allow microphone access to record."
  or "No microphone found."
