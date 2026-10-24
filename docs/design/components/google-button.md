# Google button

The full-width "Continue with Google" action at the top of the auth card. A
primary `lg` button with the Google "G" in a white circle.

**Source:** `apps/web/src/components/GoogleButton.tsx`

## Variants

| Variant   | Background         | Text                  | Icon                                     | Use                             |
| --------- | ------------------ | --------------------- | ---------------------------------------- | ------------------------------- |
| (default) | `{colors.primary}` | `{colors.on-primary}` | Google "G", 16px, in a 24px white circle | Auth card, above the OR divider |

The label is the children: "Continue with Google" on login, "Sign up with
Google" on signup.

## Sizes

| Size      | Height | Width | Typography            |
| --------- | ------ | ----- | --------------------- |
| (default) | 48px   | 100%  | `{typography.button}` |

## Tokens

- Built on `Button` (`variant="primary"`, `size="lg"`)
- Radius: `{rounded.pill}`
- The "G" keeps Google's own four brand colours; this is the one place colour
  appears on a button, because Google's brand rules require it.

## States

- Same hover, focus and disabled states as the primary `Button`.
- Disabled (e.g. until the terms box is ticked on signup): 50% opacity.
- **Dark mode:** the pill inverts to light with dark text; the white circle
  blends into it.

## Usage

```tsx
<GoogleButton onClick={signInWithGoogle}>Continue with Google</GoogleButton>
```

## Do's and Don'ts

- Do keep it the first action in the card.
- Don't recolour or redraw the "G".
