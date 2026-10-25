# Toaster

Short pop-up messages at the top centre of the screen, used for API errors
(e.g. "Email or password is incorrect") and, later, confirmations. Built on
[Sonner](https://sonner.emilkowal.ski) through shadcn.

**Source:** `apps/web/src/components/ui/sonner.tsx`, mounted once in
`apps/web/src/app/main.tsx`.

## Variants

| Variant   | Icon                                      | Use                  |
| --------- | ----------------------------------------- | -------------------- |
| `error`   | Octagon X, `{colors.semantic-error}`      | Failed API calls     |
| `success` | Circle check, `{colors.semantic-success}` | Confirmations        |
| `info`    | Info, ink                                 | Neutral notices      |
| `warning` | Triangle, ink                             | Recoverable problems |
| `loading` | Spinner, ink                              | Long-running actions |

Every variant shares one card look; only the icon carries colour.

## Tokens

- Background: `{colors.surface-card}`, 1px `{colors.hairline}` border
- Radius: `{rounded.xl}` (16px)
- Elevation: soft drop (`shadow-soft`)
- Typography: `{typography.body-sm}` in `{colors.ink}`; description in `{colors.muted}`

## States

- Auto-dismisses after 4 seconds; hover pauses it.
- **Dark mode:** follows the system setting, like the rest of the app — card
  `#1c1917`, text `#fafaf9`.

## Usage

```tsx
import { toast } from 'sonner';

toast.error(getErrorMessage(error));
```

## Do's and Don'ts

- Do use toasts for errors from the server.
- Don't use toasts for form field errors; show those under the field.
- Don't stack more than one toast for the same failure.
