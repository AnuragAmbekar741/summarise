# Floating widget

Floats its content over the page, bottom middle, and lets the user drag it
anywhere in the window. Used for the recording controls.

**Source:** `apps/web/src/components/common/FloatingWidget.tsx`

## Tokens

- Position: fixed, 24px above the bottom, centred
- Shadow: soft shadow (`shadow-soft`), `{rounded.full}`
- Kept 16px inside every edge of the window while dragging

## States

- **Hover:** grab cursor; grabbing while dragging.
- **Dragging:** starts anywhere except on a button, so buttons still click.
  Touch drags work too.
- **Window resized:** goes back to bottom middle.
- **Reload:** goes back to bottom middle (the position isn't saved).

## Usage

```tsx
<FloatingWidget label="Recording controls">
  <RecordingPill … />
</FloatingWidget>
```

## Do's and Don'ts

- Do give it a `label`; it names the group for screen readers.
- Don't put more than one on a page.
