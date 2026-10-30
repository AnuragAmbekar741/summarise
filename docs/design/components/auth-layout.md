# Auth layout

The shared frame for the login and signup pages: top nav, a big editorial
headline on the left, the auth card on the right, with the
[`PageGradient`](page-gradient.md) behind.

**Source:** `apps/web/src/components/auth-layout/AuthLayout.tsx`

## Structure

```
┌───────────────────────────────────────────────────────────┐
│ Logo                                        [navAction]   │  64px nav
│                                                           │
│   headline (display-mega)              ┌──────────────┐   │
│                                        │   card       │   │
│   description (body-md)                │  (children)  │   │
│                                        └──────────────┘   │
└───────────────────────────────────────────────────────────┘
          sky wash behind everything, from the top right
```

## Props

| Prop          | Type        | What it is                               |
| ------------- | ----------- | ---------------------------------------- |
| `navAction`   | `ReactNode` | Outline pill at the top right            |
| `headline`    | `ReactNode` | Hero h1; use `<br />` for the line break |
| `description` | `string`    | One or two sentences under the headline  |
| `children`    | `ReactNode` | Card content                             |

## Sizes & spacing

- Page: full viewport height, `{colors.canvas}` background, overflow hidden.
- Nav: 64px tall, 48px side padding (16px on mobile). It sits on top of the
  page rather than pushing it down, so the content centres in the full
  viewport.
- Content: max 1200px wide, 48px side padding, two columns on desktop
  (`1fr` + 416px card) with a 96px gap; vertically centred in the viewport.
  Desktop keeps 64px clear at the top (for the nav) and 24px at the bottom,
  so the signup card fits a 790px-tall window without scrolling.
- Headline: `{typography.display-mega}` on desktop, `display-xl` on tablet,
  `display-md` on mobile.
- Description: `{typography.body-md}` in `{colors.body}`, max 420px wide, 32px
  below the headline.
- Card: 416px max, `{colors.surface-card}`, 1px `{colors.hairline}` border,
  `{rounded.xxl}` (24px), 32px padding (24px on mobile), `shadow-soft`.

## Responsive

- Below 1024px the columns stack: headline first, card below, both centred and
  never wider than the screen.

## States

- **Dark mode:** canvas `#0c0a09`, card `#1c1917`, sky wash dimmed to 45%.

## Usage

```tsx
<AuthLayout
  navAction={
    <Button variant="outline" asChild>
      <Link to="/signup">Create account</Link>
    </Button>
  }
  headline={
    <>
      Every lecture,
      <br />
      written down.
    </>
  }
  description="Hit record in class…"
>
  …card content…
</AuthLayout>
```

## Do's and Don'ts

- Do keep one primary action in the card.
- Don't put more than the headline and description on the left.
