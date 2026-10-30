# Transcript pane

The Transcript tab of a note: one line per recorded chunk, each with its
time. It sits straight on the page, with no card or heading.

**Source:** `apps/web/src/components/note/TranscriptPane.tsx`

## Variants

| `mode`         | Last line                                                    |
| -------------- | ------------------------------------------------------------ |
| `recording`    | [`LoadingDots`](loading-dots.md) "Listening…"                |
| `paused`       | "Transcribing the last part…" while a chunk is on its way    |
| `finishing`    | `LoadingDots` "Transcribing the last part…"                  |
| `ready`        | —                                                            |
| `elsewhere`    | —                                                            |
| `uploading`    | `LoadingDots` "Uploading the recording · 42%" (no timestamp) |
| `interrupted`  | — (see States)                                               |
| `transcribing` | `LoadingDots` "Transcribing the recording…"                  |

The length, word count and upload progress are on the note's status line.

## Tokens

- Time: mono 14px, muted, in a 56px column, 16px before the text
- Text: `{typography.body-md}`, body-strong
- 24px between lines

## States

- **Couldn't transcribe:** the line reads "Couldn't transcribe this part." in
  muted italics.
- **Ready, empty:** "Nothing was said in this recording."
- **Interrupted:** "The upload stopped before it finished. Delete this note
  and upload the file again." in `{typography.body-md}`, muted.
- **Dark mode:** text and hairlines switch with the tokens.

## Usage

```tsx
<TranscriptPane segments={segments} mode="recording" transcribing={false} />
```

## Do's and Don'ts

- Do show times as `mm:ss`, or `h:mm:ss` past an hour.
- Don't put orbs behind the transcript; it is the main reading area.
