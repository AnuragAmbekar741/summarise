# Notes pane

The Notes tab of a note: a raised card where the AI notes will appear. For now
it shows an empty state and the "Build notes" button. It's only reachable once
the transcript is complete; until then the Notes tab is disabled.

**Source:** `apps/web/src/components/note/NotesPane.tsx`

## Tokens

- Card: `{colors.surface-card}`, 1px `{colors.hairline}` border,
  `{rounded.xxl}`, soft shadow (`shadow-soft`); 40px padding (32px / 24px on
  mobile)
- Text: "The transcript is complete. Build notes from it.",
  `{typography.body-md}`, muted, max 420px wide
- Button: [`Button`](button.md) `primary`, 24px below the text (does nothing
  yet)

## Atmosphere

The orbs sit inside the card and are clipped by it.

| Orb        | Position                      | Size  |
| ---------- | ----------------------------- | ----- |
| `mint`     | 256px above, 10% from left    | 520px |
| `lavender` | 288px above, 160px past right | 560px |

## States

- **Dark mode:** orbs dim to 35%.

## Usage

```tsx
<TabsContent value="notes">
  <NotesPane />
</TabsContent>
```
