# Live note card

A card on Home for a recording that hasn't been stopped yet, so the user can
get back to it. The whole card links to the note.

**Source:** `apps/web/src/components/note/LiveNoteCard.tsx`

## Variants

| State     | Dot                  | Subtitle           | Clock   |
| --------- | -------------------- | ------------------ | ------- |
| Recording | Red, pulsing         | "Taking notes now" | Running |
| Paused    | Hollow, `muted-soft` | "Paused"           | Frozen  |

A recording cut off by a closed tab also shows as Paused.

## Tokens

- Card: `{colors.surface-card}`, 1px `{colors.hairline}` border, `{rounded.2xl}`
  (24px), soft shadow; 24px padding (28px / 32px from `sm`)
- Title: `{typography.display-sm}`, ink
- Subtitle: `{typography.caption}`, muted, 4px below the title
- Clock: mono 16px / 500, ink
- "Open →": `{typography.button}`, ink; the arrow nudges right on hover

## Atmosphere

A `lavender` orb (360px) towards the middle and a `mint` orb (420px) at the
top right, both clipped by the card.

## States

- **Hover:** border darkens to `{colors.hairline-strong}`.
- **Hidden:** when the note is gone or no longer recording on the service.
- **Dark mode:** orbs dim to 35%.

## Usage

```tsx
<LiveNoteCard session={session} />
```
