# Notes pane

The right pane of a note, where the AI notes will appear: a raised card. For
now it shows an empty state and the "Build notes" button. Until the transcript
is complete the whole card is disabled.

**Source:** `apps/web/src/components/note/NotesPane.tsx`

## Variants

| `canBuild` | Text                                                                                          | Button                 |
| ---------- | --------------------------------------------------------------------------------------------- | ---------------------- |
| `false`    | "Notes appear here after you build them. You can build them once the transcript is complete." | Disabled with the card |
| `true`     | "The transcript is complete. Build notes from it."                                            | Enabled                |

## Tokens

- Card: `{colors.surface-card}`, 1px `{colors.hairline}` border,
  `{rounded.xxl}`, soft shadow (`shadow-soft`); 48px padding (32px / 24px on mobile)
- Around the card: 32px sides and bottom (16px on mobile); 32px top on desktop
  so it sits a little below the transcript heading

- Heading: "NOTES", `{typography.caption-uppercase}`, ink
- Text: `{typography.body-md}`, muted, max 420px wide, 32px below the heading
- Button: [`Button`](button.md) `primary`, 24px below the text

## Atmosphere

The orbs sit inside the card and are clipped by it.

| Orb        | Position                      | Size  |
| ---------- | ----------------------------- | ----- |
| `mint`     | 256px above, 10% from left    | 520px |
| `lavender` | 288px above, 160px past right | 560px |

## States

- **Disabled:** until the transcript is complete the whole card is 50% opacity
  and `inert`: nothing in it can be clicked, focused or selected.
- **Dark mode:** orbs dim to 35%.

## Usage

```tsx
<NotesPane canBuild={status === 'ready'} />
```
