# Note list

The user's notes on Home, grouped by day, newest first. Each row opens the
note.

**Source:** `apps/web/src/components/note/NoteList.tsx`

## Variants

| Note status  | Under the title                                          |
| ------------ | -------------------------------------------------------- |
| `ready`      | Nothing                                                  |
| `processing` | [`LoadingDots`](loading-dots.md) "Finishing transcript…" |
| `recording`  | "Recording", muted                                       |

## Tokens

- Day heading: `{typography.caption-uppercase}`, muted, e.g. "WED, OCT 21"
- Title: `{typography.display-sm}`, ink, one line, truncated
- Time and length (right): `{typography.caption}`, muted, e.g.
  "10:00am · 42 min"; just the time while the length isn't known yet
- Spacing: 16px from the day heading to its first row, 8px between rows
  (each row has 8px padding top and bottom), 48px between days

## States

- **Hover or focus:** the title underlines and the ⋯ actions menu appears at
  the far right. The time stays visible beside it. On touch screens the menu
  is always shown.
- **Dark mode:** follows the tokens.

## Usage

```tsx
<NoteList notes={notes} />
```

## Do's and Don'ts

- Do pass the notes newest first, as `GET /notes` returns them.
- Don't list a note that already has a live card above.
