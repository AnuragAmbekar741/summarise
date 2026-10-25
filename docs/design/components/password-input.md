# Password input

A password field with an eye button that shows or hides what's typed.

**Source:** `apps/web/src/components/ui/password-input.tsx` (wraps
[`Input`](input.md))

## Variants

| State   | Field shows | Button icon | Button label    |
| ------- | ----------- | ----------- | --------------- |
| Hidden  | `•••••`     | Eye         | "Show password" |
| Visible | plain text  | Eye off     | "Hide password" |

Starts hidden every time the page loads.

## Sizes

Same as `Input`: 44px tall, full width. The text stops 48px from the right
edge so it never runs under the button. The button is 32px square, 6px from
the right edge, vertically centred.

## Tokens

- Field: everything from [`Input`](input.md)
- Icon: 16px, `{colors.muted}`, `{colors.ink}` on hover
- Button radius: `{rounded.md}` (8px)

## States

- Focus on the button: 2px ring, like other buttons.
- Error: the field takes `aria-invalid` exactly like `Input`.
- The button is `type="button"`, so it never submits the form, and
  `aria-pressed` tells screen readers whether the password is shown.
- **Dark mode:** icon `#a8a29e`, light ink on hover.

## Usage

```tsx
<PasswordInput
  id="password"
  autoComplete="current-password"
  aria-invalid={!!errors.password}
  {...register('password')}
/>
```

## Do's and Don'ts

- Do use it for every password field.
- Don't remember the visible state between visits.
