# Notes pane

The right pane of a note, where the AI notes will appear. For now it shows an
empty state and the "Build notes" button.

**Source:** `apps/web/src/components/note/NotesPane.tsx`

## Variants

| `canBuild` | Text                                                                                          | Button   |
| ---------- | --------------------------------------------------------------------------------------------- | -------- |
| `false`    | "Notes appear here after you build them. You can build them once the transcript is complete." | Disabled |
| `true`     | "The transcript is complete. Build notes from it."                                            | Enabled  |

## Tokens

- Heading: "NOTES", `{typography.caption-uppercase}`, ink
- Text: `{typography.body-md}`, muted, max 420px wide, 32px below the heading
- Button: [`Button`](button.md) `primary`, 24px below the text

## Atmosphere

| Orb        | Position                      | Size  |
| ---------- | ----------------------------- | ----- |
| `mint`     | 256px above, 10% from left    | 520px |
| `lavender` | 288px above, 160px past right | 560px |

## States

- **Disabled button:** 50% opacity until the transcript is complete.
- **Dark mode:** orbs dim to 35%.

## Usage

```tsx
<NotesPane canBuild={status === 'ready'} />
```
