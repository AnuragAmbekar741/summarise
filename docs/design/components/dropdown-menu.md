# Dropdown menu

A small menu that opens from a trigger. The shadcn/ui component, unchanged;
it takes its colours from the shadcn variables, which point at our tokens.

**Source:** `apps/web/src/components/ui/dropdown-menu.tsx`

## Variants

Used as-is: `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`,
`DropdownMenuLabel`, `DropdownMenuItem`, `DropdownMenuSeparator` (plus
checkbox, radio and sub-menu parts, unused so far).

## Tokens

- Panel: `{colors.surface-card}` (popover), `{rounded.lg}`, 4px padding, shadow
- Items: 14px Inter, `{rounded.md}`; the highlighted item (hover or arrow
  keys) gets `{colors.surface-strong}`
- Separator: 1px `{colors.hairline}`

## States

- **Open / close:** fades and zooms in from the trigger.
- **Disabled item:** 50% opacity.
- **Dark mode:** follows the tokens.

## Usage

```tsx
<DropdownMenu>
  <DropdownMenuTrigger>…</DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuItem onSelect={…}>Log out</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```
