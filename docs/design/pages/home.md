# Home

The Notes page: where a note is started, a recording in progress can be
reopened, and every earlier note is listed.

**Route:** `/`
**Source:** `apps/web/src/pages/HomePage.tsx`

## Layout

- **Header**, full width, no line below: logo on the left, account menu on
  the right. 64px tall (80px from `sm`).
- **Main**, centred, max 1064px wide: the "Notes" heading with the
  "Upload recording" and "Start notetaker" pills on the right, 12px apart
  (wrapping below on narrow screens), then
  one live card per unfinished recording, then the note list.

## Components

| Component                                         | Variant         | Where                        |
| ------------------------------------------------- | --------------- | ---------------------------- |
| [`Logo`](../components/logo.md)                   | —               | Header left                  |
| [`AccountMenu`](../components/account-menu.md)    | —               | Header right                 |
| [`Button`](../components/button.md)               | `outline`, `lg` | "Upload recording"           |
| [`Button`](../components/button.md)               | `primary`, `lg` | "Start notetaker"            |
| [`UploadDialog`](../components/upload-dialog.md)  | —               | Opened by "Upload recording" |
| [`LiveNoteCard`](../components/live-note-card.md) | —               | Below the heading            |
| [`NoteList`](../components/note-list.md)          | —               | Below the cards              |

## Typography & spacing

| Piece              | Token                                                | Spacing                             |
| ------------------ | ---------------------------------------------------- | ----------------------------------- |
| Heading            | `{typography.display-mega}` (`display-xl` on mobile) | 56px below the header (48px mobile) |
| Live cards         | —                                                    | 48px below the heading, 16px apart  |
| Note list          | —                                                    | 48px below the cards or heading     |
| Empty / error text | `{typography.body-md}`, muted                        | 48px below the heading              |

## Atmosphere

[`PageGradient`](../components/page-gradient.md): the sky wash from the top
right, dimmed in dark mode.

## Copy

- Heading: "Notes"
- Button: "Upload recording" (upload icon)
- Button: "Start notetaker" (red record icon), "Starting…" while it works
- No notes: "No notes yet. Start the notetaker in your next lecture."
- List failed to load: "Couldn't load your notes."

## States

- **Starting:** the button is disabled and reads "Starting…" while the note
  is created and the mic turns on, then the note opens.
- **Recording in this tab:** the button is disabled (one recording at a time)
  and the live card shows the running clock.
- **Mic blocked:** a toast says "Allow microphone access to record."; the note
  still opens, paused, so the user can press Resume.
- **Uploading:** pressing Upload in the dialog closes it; the new note shows
  at the top of the list with its upload percentage, then "Finishing
  transcript…". The list polls every 5s while any note is uploading or being
  transcribed.
- **Nothing recording:** no cards; the list starts below the heading.
- **Loading the list:** nothing shows in its place until it arrives.
- **No notes at all:** the "No notes yet" line, only when there are no live
  cards either.
- **A note with a live card** is left out of the list, so it isn't shown
  twice.
