# Label

The name above a form field. Clicking it focuses the field.

**Source:** `apps/web/src/components/ui/label.tsx` (Radix Label)

## Variants

| Variant   | Text           | Typography                 | Use                    |
| --------- | -------------- | -------------------------- | ---------------------- |
| (default) | `{colors.ink}` | `{typography.body-strong}` | Above every form field |

## Tokens

- Typography: `{typography.body-strong}` (Inter 16px / 500)
- Colors: `{colors.ink}`

## States

- Disabled: 50% opacity when the paired field (a `peer`) is disabled.
- **Dark mode:** light ink text.

## Usage

```tsx
<Label htmlFor="name">Name</Label>
<Input id="name" />
```

Leave 12px between a label and its field.

## Do's and Don'ts

- Do keep labels short: one or two words.
- Don't use placeholder text instead of a label.
