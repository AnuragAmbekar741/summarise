# Status chip

Where a note stands, in the note header whenever this tab isn't recording it.
While recording, the [`RecordingPill`](recording-pill.md) takes its place.

**Source:** `apps/web/src/components/note/StatusChip.tsx`

## Variants

| `status`    | Dot                         | Label                 |
| ----------- | --------------------------- | --------------------- |
| `ready`     | `{colors.semantic-success}` | "TRANSCRIPT READY"    |
| `elsewhere` | `{colors.semantic-error}`   | "RECORDING ELSEWHERE" |

## Sizes

| Size    | Height | Padding | Typography                       |
| ------- | ------ | ------- | -------------------------------- |
| default | 44px   | 20px    | `{typography.caption-uppercase}` |

## Tokens

- Background: `{colors.surface-strong}`, text `{colors.ink}`
- Dot: 8px, 10px before the label
- Radius: `{rounded.full}`

## States

Not interactive. In dark mode the background and text switch with the tokens.

## Usage

```tsx
<StatusChip status="ready" />
```

## Do's and Don'ts

- Do keep labels short and uppercase.
- Don't show it next to the recording pill.
