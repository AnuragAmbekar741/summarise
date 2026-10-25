# Loading dots

Three dots bouncing in turn, with optional shimmering text after them. Use it
wherever something is being worked on in the background, e.g. "Listening…".

**Source:** `apps/web/src/components/common/LoadingDots.tsx`

## Variants

| Variant    | Content                                   | Use                                   |
| ---------- | ----------------------------------------- | ------------------------------------- |
| Dots only  | Three 6px dots                            | Small inline waits                    |
| With label | Dots, 12px gap, then the shimmering label | "Listening…", "Finishing transcript…" |

## Tokens

- Colors: `currentColor` (defaults to `{colors.muted}`), so it works on any
  surface, including the inverted primary pill
- Dots: 6px, `{rounded.full}`, 4px apart, each 160ms behind the last
- Shimmer: a brighter band of the text's own colour sweeping left every 2s

## States

- **Reduced motion:** dots and shimmer stand still.
- **Dark mode:** follows the text colour it is given.

## Usage

```tsx
<LoadingDots label="Listening…" />
```

## Do's and Don'ts

- Do end labels with an ellipsis.
- Don't use it for page loads; render nothing instead.
