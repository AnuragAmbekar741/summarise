# Checkbox

A square tick box for yes/no choices, e.g. agreeing to the terms.

**Source:** `apps/web/src/components/ui/checkbox.tsx` (Radix Checkbox)

## Variants

| State     | Background              | Border                         | Mark                       |
| --------- | ----------------------- | ------------------------------ | -------------------------- |
| Unchecked | `{colors.surface-card}` | 1px `{colors.hairline-strong}` | none                       |
| Checked   | `{colors.primary}`      | `{colors.primary}`             | `{colors.on-primary}` tick |

## Sizes

| Size      | Box  | Tick |
| --------- | ---- | ---- |
| (default) | 20px | 14px |

## Tokens

- Radius: `{rounded.xs}` (4px)
- Colors: `{colors.surface-card}`, `{colors.hairline-strong}`, `{colors.primary}`, `{colors.on-primary}`

## States

- Focus: 2px ring with a 2px canvas offset, same as buttons.
- Disabled: 50% opacity, not-allowed cursor.
- **Dark mode:** checked fill inverts to the light primary with a dark tick.

## Usage

```tsx
<Checkbox id="agree" checked={agreed} onCheckedChange={(v) => setAgreed(v === true)} />
<label htmlFor="agree">I agree…</label>
```

## Do's and Don'ts

- Do give every checkbox a clickable label.
- Don't use a checkbox for an action; use a button.
