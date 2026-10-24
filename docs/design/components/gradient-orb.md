# Gradient orb

A soft, blurred pastel circle placed behind content as atmosphere. It holds no
content and ignores clicks.

**Source:** `apps/web/src/components/common/GradientOrb.tsx`

## Variants

| `color`    | Token                        |
| ---------- | ---------------------------- |
| `mint`     | `{colors.gradient-mint}`     |
| `peach`    | `{colors.gradient-peach}`    |
| `lavender` | `{colors.gradient-lavender}` |
| `sky`      | `{colors.gradient-sky}`      |
| `rose`     | `{colors.gradient-rose}`     |

## Sizes

No fixed size. The page sets position and size through `className`
(e.g. `-top-40 -left-40 size-[640px]`). Typical orbs are 480–720px across and
sit partly off-screen.

## Tokens

- Colors: one `{colors.gradient-*}` fading to transparent at 70% of the radius
- Shape: `{rounded.full}`, 40px blur
- Opacity: `--orb-opacity` (1 in light, 0.35 in dark)

## States

- **Dark mode:** same hues, dimmed to 35% so they glow instead of glare.

## Usage

The parent must be `relative` and `overflow-hidden`.

```tsx
<div className="relative overflow-hidden">
  <GradientOrb color="peach" className="-top-40 -left-40 size-[640px]" />
  …content…
</div>
```

## Do's and Don'ts

- Do use two to four orbs per page, in different colours, near the edges.
- Don't put orbs behind small text where they lower contrast.
- Don't use orb colours on buttons, text or card backgrounds.
