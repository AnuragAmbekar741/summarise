# Note

One note, in a single column like Home: the title and description (edited in
place), a status line, then the transcript and the AI notes as two tabs. While
recording, the controls float at the bottom of the screen.

**Route:** `/notes/:noteId`
**Source:** `apps/web/src/pages/note/NotePage.tsx`

## Layout

- **Header**, as on [Home](home.md): logo left, account menu right.
- **Main**, centred, max 1064px wide:
  - "‹ All notes" back link
  - Title, then description
  - Status line: [`StatusChip`](../components/status-chip.md), then the date,
    length and word count
  - [`Tabs`](../components/tabs.md): Transcript (default) and Notes
- **Transcript tab:** the lines sit straight on the page, no card.
- **Notes tab:** the [`NotesPane`](../components/notes-pane.md) card.
- **Recording controls:** the [`RecordingPill`](../components/recording-pill.md)
  in a [`FloatingWidget`](../components/floating-widget.md), bottom middle,
  draggable.

## Components

| Component                                            | Variant                              | Where             |
| ---------------------------------------------------- | ------------------------------------ | ----------------- |
| [`Logo`](../components/logo.md)                      | —                                    | Header left       |
| [`AccountMenu`](../components/account-menu.md)       | —                                    | Header right      |
| [`EditableText`](../components/editable-text.md)     | Title (`h1`), description            | Top of main       |
| [`StatusChip`](../components/status-chip.md)         | Follows the page state               | Status line       |
| [`Tabs`](../components/tabs.md)                      | Transcript / Notes                   | Below status line |
| [`TranscriptPane`](../components/transcript-pane.md) | Follows the page state               | Transcript tab    |
| [`NotesPane`](../components/notes-pane.md)           | —                                    | Notes tab         |
| [`FloatingWidget`](../components/floating-widget.md) | —                                    | Bottom middle     |
| [`RecordingPill`](../components/recording-pill.md)   | `recording` / `paused` / `finishing` | In the widget     |

## Typography & spacing

| Piece       | Token                                                | Spacing                                 |
| ----------- | ---------------------------------------------------- | --------------------------------------- |
| Back link   | `{typography.nav-link}`, muted (ink on hover)        | 48px below the header (32px mobile)     |
| Title       | `{typography.display-mega}` (`display-md` on mobile) | 16px below the back link                |
| Description | `{typography.body-md}`, body, full width             | 16px below the title                    |
| Status line | Chip, then `{typography.body-sm}`, muted             | 20px below the description; 16px gap    |
| Tabs        | —                                                    | 48px below the status line              |
| Tab content | —                                                    | 32px below the tabs; 96px at the bottom |

## Atmosphere

The same [`PageGradient`](../components/page-gradient.md) as Home. The notes
card has its own orbs; see [`NotesPane`](../components/notes-pane.md).

## Copy

- Back link: "All notes"
- Description placeholder: "Add a description"
- Status line: "Sun, Oct 25 · 3:36pm", plus " · 48 min · 6,210 words" once
  ready, plus " · 2 parts uploading" while chunks wait to upload

## States

The page state comes from the service's note status and this browser's
recorder, or for an uploaded file, this tab's upload:

| State          | When                                                     | Chip                  | Floating pill | Notes tab |
| -------------- | -------------------------------------------------------- | --------------------- | ------------- | --------- |
| `recording`    | This tab is recording the note                           | "Recording"           | `recording`   | Disabled  |
| `paused`       | Paused, or cut off by a reload (Resume carries on)       | "Paused"              | `paused`      | Disabled  |
| `finishing`    | Stop clicked, last chunks still arriving                 | "Finishing"           | `finishing`   | Disabled  |
| `ready`        | Every chunk is transcribed                               | "Transcript ready"    | —             | Enabled   |
| `elsewhere`    | Recording in another browser                             | "Recording elsewhere" | —             | Disabled  |
| `uploading`    | This tab is sending the uploaded file                    | "Uploading"           | —             | Disabled  |
| `interrupted`  | Uploaded file never arrived (its tab closed or reloaded) | "Upload interrupted"  | —             | Disabled  |
| `transcribing` | Uploaded file arrived, being transcribed                 | "Transcribing"        | —             | Disabled  |

- **Editing:** double-click the title or description (or use the hover
  pencil) and type in place. Enter or clicking away saves, Esc cancels. A
  failed save puts the old text back and shows a toast. The title stops at
  200 characters and the description at 75 (the service allows 2,000; the
  shorter limit is the web app's).
- **Deleting while uploading:** the upload stops first, so the file never
  reaches the bucket.
- **Loading:** nothing renders until the note has loaded.
- **Not found:** "This note doesn't exist." with a "Back to notes" link.
- **Error:** "Couldn't load this note. Please try again."
- **Microphone errors** show as a toast: "Allow microphone access to record."
  or "No microphone found."
