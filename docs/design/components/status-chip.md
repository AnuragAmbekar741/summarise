# Status chip

Where a note stands, at the start of the line under the note's title.

**Source:** `apps/web/src/components/note/StatusChip.tsx`

## Variants

| `mode`      | Dot                                | Label                 |
| ----------- | ---------------------------------- | --------------------- |
| `recording` | `{colors.semantic-error}`, pulsing | "RECORDING"           |
| `paused`    | Ring of `{colors.muted}`           | "PAUSED"              |
| `finishing` | `{colors.muted}`, pulsing          | "FINISHING"           |
| `ready`     | `{colors.semantic-success}`        | "TRANSCRIPT READY"    |
| `elsewhere` | `{colors.semantic-error}`          | "RECORDING ELSEWHERE" |

## Sizes

| Size    | Height | Padding | Typography                       |
| ------- | ------ | ------- | -------------------------------- |
| default | 28px   | 12px    | `{typography.caption-uppercase}` |

## Tokens

- Background: `{colors.surface-strong}`, text `{colors.ink}`
- Dot: 8px, 8px before the label
- Radius: `{rounded.full}`

## States

Not interactive. Pulsing dots stop for reduced motion. In dark mode the
background and text switch with the tokens.

## Usage

```tsx
<StatusChip mode="ready" />
```

## Do's and Don'ts

- Do keep labels short and uppercase.
- Don't use it as a button.
