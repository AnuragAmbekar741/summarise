# Page gradient

The atmosphere at the top right of full pages (Home, Note): two
[`GradientOrb`](gradient-orb.md)s. It holds no content and ignores clicks.

**Source:** `apps/web/src/components/common/PageGradient.tsx`

## Variants

| Theme | Orbs                                  |
| ----- | ------------------------------------- |
| Light | `sky` only, at 50% opacity            |
| Dark  | `sky` and `peach`, at `--orb-opacity` |

## Tokens

| Orb     | Position                      | Size  |
| ------- | ----------------------------- | ----- |
| `sky`   | 288px above, 18% from right   | 720px |
| `peach` | 256px above, 256px past right | 720px |

## States

- **Dark mode:** both orbs, dimmed by `--orb-opacity` (35%).
- **Light mode:** a lighter sky alone; no peach.

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

- Do use it once per page, at the top.
- Don't add peach back in light mode.
