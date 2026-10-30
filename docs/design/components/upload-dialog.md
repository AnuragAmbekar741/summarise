# Upload dialog

The modal for uploading a lecture recording from Home. The user picks or drops
one audio or video file and presses Upload; the dialog closes straight away and
the upload carries on in the background, with its progress in the
[`NoteList`](note-list.md).

**Source:** `apps/web/src/components/upload/UploadDialog.tsx`

## Variants

| State       | Middle of the dialog                                                            | Upload   |
| ----------- | ------------------------------------------------------------------------------- | -------- |
| Empty       | Dashed drop zone: upload icon, "Drop a file here", "or browse your files"       | Disabled |
| Dragging    | Drop zone border turns ink, fill `{colors.surface-strong}`, "Drop to choose it" | Disabled |
| File chosen | File row: file icon, name (truncated), size, ✕ to remove                        | Enabled  |
| Wrong file  | Drop zone with a red border and a [`FieldError`](field-error.md) below          | Disabled |

The error messages come from the service's own rules: "Choose an audio or
video file", "Use a file of at most 500 MB", "The file is empty".

## Tokens

- Card: [`Dialog`](dialog.md) at 460px wide, 24px corners, 28px
  padding, 24px between sections (same as the delete dialog)
- Title: `{typography.display-sm}`, light, ink
- Description: `{typography.body-sm}`, muted
- Drop zone: 1px dashed `{colors.hairline-strong}`, `{rounded.2xl}` (24px), 36px
  vertical padding; icon in a 44px `{colors.surface-strong}` circle
- File row: `{colors.canvas-soft}` fill, 1px `{colors.hairline}` border,
  `{rounded.2xl}`; name `{typography.body-sm}` ink, size `{typography.caption}`
  muted
- Buttons: [`Button`](button.md) `outline` "Cancel" and `primary` "Upload",
  right-aligned (stacked, Upload on top, on mobile)

## States

- **Hover:** the drop zone fills with `{colors.canvas-soft}`.
- **Focus:** the drop zone and ✕ show the focus ring.
- **Closing:** Cancel, ✕, Escape or a click outside close it and forget the
  chosen file.
- **Dark mode:** follows the tokens.

## Usage

```tsx
<UploadDialog open={open} onOpenChange={setOpen} />
```

## Do's and Don'ts

- Do keep the dialog for picking the file only; progress belongs in the list.
- Don't block the dialog while uploading; it closes as soon as Upload is
  pressed.
