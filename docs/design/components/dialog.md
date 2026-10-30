# Dialog

The modal primitive (shadcn, on Radix) for dialogs that hold a form or a
choice, like the [`UploadDialog`](upload-dialog.md). For a yes/no
confirmation, use the alert dialog instead.

**Source:** `apps/web/src/components/ui/dialog.tsx`

## Tokens

- Overlay: black at 10%, with a light backdrop blur
- Card: `{colors.surface-card}`, ring of ink at 10%, centred; callers set the
  width, radius and padding
- Close button: 32px circle at the top right, muted ✕; hover fills
  `{colors.surface-strong}` and turns the icon ink

## States

- **Open / close:** fades and zooms (95% → 100%) over 100ms.
- **Focus:** stays inside the dialog while it's open; Escape closes it.
- **Dark mode:** follows the tokens.

## Usage

```tsx
<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent className="gap-6 rounded-3xl p-7 sm:max-w-[460px]">
    <DialogHeader>
      <DialogTitle>…</DialogTitle>
      <DialogDescription>…</DialogDescription>
    </DialogHeader>
    …
  </DialogContent>
</Dialog>
```
