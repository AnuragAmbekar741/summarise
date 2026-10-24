# Wave lines

Two thin, flowing lines across the full width of the page, hinting at a sound
wave. Pure decoration.

**Source:** `apps/web/src/components/WaveLines.tsx`

## Variants

| Variant   | Stroke                         | Use                                 |
| --------- | ------------------------------ | ----------------------------------- |
| (default) | 1px `{colors.hairline-strong}` | Behind the lower half of auth pages |

## Sizes

Full width, 160px tall. The lines stretch with the page width. The page sets
the vertical position through `className` (e.g. `top-[70%]`).

## Tokens

- Colors: `{colors.hairline-strong}`

## States

- **Dark mode:** stroke becomes the dark `hairline-strong` (`#44403c`).

## Usage

The parent must be `relative`.

```tsx
<WaveLines className="top-[70%]" />
```

## Do's and Don'ts

- Do keep them behind content and low-contrast.
- Don't animate them or give them colour.
