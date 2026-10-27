# Transcript pane

The left pane of a note: the transcript, one line per recorded chunk, each
with its time.

**Source:** `apps/web/src/components/note/TranscriptPane.tsx`

## Variants

| `mode`      | Caption (right)               | Last line                                                 |
| ----------- | ----------------------------- | --------------------------------------------------------- |
| `recording` | —                             | [`LoadingDots`](loading-dots.md) "Listening…"             |
| `paused`    | —                             | "Transcribing the last part…" while a chunk is on its way |
| `finishing` | —                             | `LoadingDots` "Transcribing the last part…"               |
| `ready`     | "48 min · 6,210 words"        | —                                                         |
| `elsewhere` | "Recording on another device" | —                                                         |

While chunks are waiting to upload, the caption reads "2 parts uploading"
instead.

## Tokens

- Heading: "TRANSCRIPT", `{typography.caption-uppercase}`, ink
- Caption: `{typography.caption}`, muted
- Time: mono 14px, muted, in a 56px column, 16px before the text
- Text: `{typography.body-md}`, body-strong
- 24px between lines; first line 32px below the heading

## States

- **Couldn't transcribe:** the line reads "Couldn't transcribe this part." in
  muted italics.
- **Ready, empty:** "Nothing was said in this recording."
- **Dark mode:** text and hairlines switch with the tokens.

## Usage

```tsx
<TranscriptPane
  segments={segments}
  mode="recording"
  durationMs={null}
  pendingChunks={0}
  transcribing={false}
/>
```

## Do's and Don'ts

- Do show times as `mm:ss`, or `h:mm:ss` past an hour.
- Don't put orbs behind the transcript; it is the main reading area.
