# Tabs

A pill-shaped switch between two or more views on one page, e.g. a note's
Transcript and Notes. Built on Radix Tabs.

**Source:** `apps/web/src/components/ui/tabs.tsx`

## Sizes

| Size    | Height | Padding                        | Typography              |
| ------- | ------ | ------------------------------ | ----------------------- |
| default | 44px   | 4px around; 20px sides per tab | `{typography.nav-link}` |

## Tokens

- Track: `{colors.surface-strong}`, `{rounded.full}`
- Tab: muted text; ink on hover
- Active tab: `{colors.surface-card}` (`{colors.hairline-strong}` in dark),
  ink text, soft shadow

## States

- **Hover:** text turns ink.
- **Focus:** 2px ring (keyboard only).
- **Disabled:** 50% opacity, can't be selected.
- **Keyboard:** arrow keys move between tabs.

## Usage

```tsx
<Tabs defaultValue="transcript">
  <TabsList>
    <TabsTrigger value="transcript">Transcript</TabsTrigger>
    <TabsTrigger value="notes" disabled={!ready}>
      Notes
    </TabsTrigger>
  </TabsList>
  <TabsContent value="transcript">…</TabsContent>
  <TabsContent value="notes">…</TabsContent>
</Tabs>
```

## Do's and Don'ts

- Do keep labels to one word.
- Don't hide a tab that isn't ready yet; disable it.
