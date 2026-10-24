# Input

A single-line text field for forms: name, email, password.

**Source:** `apps/web/src/components/ui/input.tsx`

## Variants

| Variant   | Background              | Text           | Border                         | Use               |
| --------- | ----------------------- | -------------- | ------------------------------ | ----------------- |
| (default) | `{colors.surface-card}` | `{colors.ink}` | 1px `{colors.hairline-strong}` | Every text field. |

## Sizes

| Size      | Height | Padding  | Typography             |
| --------- | ------ | -------- | ---------------------- |
| (default) | 44px   | 0 × 16px | `{typography.body-md}` |

Full width of its container.

## Tokens

- Typography: `{typography.body-md}`
- Radius: `{rounded.md}` (8px)
- Colors: `{colors.surface-card}`, `{colors.ink}`, `{colors.hairline-strong}`, `{colors.muted-soft}` (placeholder), `{colors.semantic-error}`

## States

| State       | Look                                                      |
| ----------- | --------------------------------------------------------- |
| Placeholder | `{colors.muted-soft}` text                                |
| Focus       | Border becomes 2px `{colors.ink}` (1px border + 1px ring) |
| Error       | `aria-invalid` → 2px `{colors.semantic-error}` border     |
| Disabled    | 50% opacity                                               |

**Dark mode:** background `#1c1917`, border `#44403c`, text `#fafaf9`; focus
border becomes light ink.

## Usage

```tsx
<Label htmlFor="email">Email</Label>
<Input id="email" type="email" placeholder="you@university.edu" />
```

## Do's and Don'ts

- Do pair every input with a `Label`.
- Do use the right `type` and `autoComplete` (`email`, `current-password`, `new-password`).
- Don't use a pill radius on inputs; pills are for buttons.
