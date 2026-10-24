# Button

The pill-shaped action. One primary button per view carries the main action;
outline and tertiary buttons carry everything else.

**Source:** `apps/web/src/components/ui/button.tsx`

## Variants

| Variant    | Background         | Text                  | Border                         | Use                                             |
| ---------- | ------------------ | --------------------- | ------------------------------ | ----------------------------------------------- |
| `primary`  | `{colors.primary}` | `{colors.on-primary}` | none                           | The main action on a view. Use scarcely.        |
| `outline`  | transparent        | `{colors.ink}`        | 1px `{colors.hairline-strong}` | Secondary actions, e.g. "Continue with Google". |
| `tertiary` | transparent        | `{colors.ink}`        | none                           | Inline text actions, e.g. "Forgot password?".   |

`primary` is the default.

## Sizes

| Size      | Height      | Padding                                       | Typography            |
| --------- | ----------- | --------------------------------------------- | --------------------- |
| `default` | 40px        | 10px × 20px (outline 9px × 19px + 1px border) | `{typography.button}` |
| `icon`    | 40px × 40px | none                                          | icon 16px             |

`tertiary` at `default` size has no height or padding, so it sits inline with
text.

## Tokens

- Typography: `{typography.button}` (Inter 15px / 500 / line height 1)
- Radius: `{rounded.pill}`
- Colors: `{colors.primary}`, `{colors.primary-active}`, `{colors.on-primary}`, `{colors.ink}`, `{colors.hairline-strong}`, `{colors.surface-strong}`

## States

| State    | primary                        | outline                        | tertiary  |
| -------- | ------------------------------ | ------------------------------ | --------- |
| Hover    | `{colors.primary-active}`      | `{colors.surface-strong}` fill | underline |
| Active   | `{colors.primary-active}`      | `{colors.surface-strong}` fill | underline |
| Focus    | 2px ring, 2px canvas offset    | same                           | same      |
| Disabled | 50% opacity, no pointer events | same                           | same      |

**Dark mode:** the primary pill inverts to a light pill (`#fafaf9`) with dark
text (`#0c0a09`); press state is `#e7e5e4`. Outline uses the dark
`hairline-strong` (`#44403c`) border and light ink text.

## Usage

```tsx
import { Button } from '@/components/ui/button';

<Button>Sign in</Button>
<Button variant="outline">Continue with Google</Button>
<Button variant="tertiary">Forgot password?</Button>
<Button asChild><a href="/signup">Create account</a></Button>
```

## Do's and Don'ts

- Do keep one `primary` button per view.
- Do use the pill shape for every button.
- Don't give a button a colour fill other than ink, and never a gradient-orb colour.
- Don't change the button text size or weight per page.
