# Editable text

Text the user edits where it stands, with no input box: the note title and
description. It looks exactly like the text around it until you type.

**Source:** `apps/web/src/components/common/EditableText.tsx`

## Variants

| Prop          | Effect                                               |
| ------------- | ---------------------------------------------------- |
| `as`          | `h1` or `p`; styling comes from `className`          |
| `multiline`   | Shift+Enter adds a new line; Enter still saves       |
| `required`    | Clearing it puts the old text back instead of saving |
| `placeholder` | Shown in muted-soft while the text is empty          |

## Tokens

- Typography and colour: whatever the caller passes; editing never changes them
- Placeholder: `{colors.muted-soft}`
- Pencil: 28px round button, 16px icon, muted; `{colors.surface-strong}` on hover

## States

- **Start editing:** double-click, or the pencil that shows on hover (the way
  in from the keyboard). A double-click keeps the word it selected; the pencil
  puts the caret at the end. The text itself can't take focus until then, so a
  single click does nothing.
- **Editing:** no border, outline or background; spellcheck on. Keys stay in
  the field, so page shortcuts (D for the theme) don't fire. Pasting drops
  formatting.
- **Save:** Enter or clicking away. Text is trimmed; single-line text has its
  spaces collapsed. Unchanged text isn't saved.
- **Cancel:** Esc puts the old text back.
- **Dark mode:** follows the caller's colours.

## Usage

```tsx
<EditableText
  as="h1"
  label="Title"
  value={title}
  required
  onSave={(next) => updateNote.mutate({ title: next })}
  className="text-display-md"
/>
```

## Do's and Don'ts

- Do give every instance a `label`; it names the field for screen readers.
- Don't add a border or background while editing; it should feel like typing
  on the page.
