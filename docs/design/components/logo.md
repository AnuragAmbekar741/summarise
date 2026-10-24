# Logo

The Summarise wordmark: a waveform glyph followed by the name in the display
serif. Links to `/`.

**Source:** `apps/web/src/components/Logo.tsx`

## Variants

| Variant   | Glyph                          | Text                                   | Use                       |
| --------- | ------------------------------ | -------------------------------------- | ------------------------- |
| (default) | Lucide `AudioLines`, 20px, ink | "Summarise", `{typography.display-sm}` | Top-left of every top nav |

## Tokens

- Typography: `{typography.display-sm}` (Newsreader 24px / 300)
- Colors: `{colors.ink}`
- Gap between glyph and text: 8px

## States

- **Dark mode:** glyph and text switch to light ink.

## Usage

```tsx
<Logo />
```

## Do's and Don'ts

- Do keep it at the top-left of the page.
- Don't bold the wordmark or colour it.
