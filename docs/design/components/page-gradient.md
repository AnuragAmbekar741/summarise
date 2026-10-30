# Page gradient

The Sky Wash: one soft sky glow from the top right corner of every full page
(Home, Note, Login, Signup). It holds no content and ignores clicks.

**Source:** `apps/web/src/components/common/PageGradient.tsx`

## Tokens

- Colour: `{colors.gradient-sky}`
- Shape: radial gradient, 1300 × 850px radius, centred on the top right corner
- Strength: 45% sky at the corner, fading to transparent along a smoothstep
  curve so there is no visible edge (`bg-sky-wash` utility in `index.css`)
- Opacity: `--wash-opacity` (1 in light, 0.45 in dark)

## States

- **Dark mode:** the same wash, dimmed to 45%.

## Usage

The parent must be `relative` and `overflow-hidden`; content above it needs
`relative z-10`.

```tsx
<div className="relative min-h-svh overflow-hidden bg-canvas">
  <PageGradient />
  <main className="relative z-10">…</main>
</div>
```

## Do's and Don'ts

- Do use it once per page, and the same on every page.
- Don't add orbs or other colours to the page background.
