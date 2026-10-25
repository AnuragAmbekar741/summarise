# Field error

A one-line message under a form field saying what's wrong with it, e.g.
"Enter a valid email". Server errors go to the [toaster](toaster.md) instead.

**Source:** `apps/web/src/components/common/FieldError.tsx`

## Variants

| Variant   | Text                      | Typography             | Use                    |
| --------- | ------------------------- | ---------------------- | ---------------------- |
| (default) | `{colors.semantic-error}` | `{typography.caption}` | Under an invalid input |

Renders nothing when there's no message.

## Sizes

Full width of the field. Sits 8px below the input (the field group's gap).

## Tokens

- Typography: `{typography.caption}` (Inter 14px / 400)
- Colors: `{colors.semantic-error}`

## States

- Shown together with the input's error state (`aria-invalid` → red border).
- Announced to screen readers (`role="alert"`) and linked to the input with
  `aria-describedby`.
- **Dark mode:** `#ef4444`.

## Usage

```tsx
<Input
  id="email"
  aria-invalid={!!errors.email}
  aria-describedby="email-error"
  {...register('email')}
/>
<FieldError id="email-error" message={errors.email?.message} />
```

## Do's and Don'ts

- Do say how to fix it ("Use at least 8 characters"), not just that it's wrong.
- Don't show more than one message per field.
