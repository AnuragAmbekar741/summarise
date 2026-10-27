# Recording pill

The recording controls of a note: a status dot, the recording clock, Pause or
Resume, and Stop, all in one pill. On the note page it floats in a
[`FloatingWidget`](floating-widget.md), bottom middle, and can be dragged.

**Source:** `apps/web/src/components/note/RecordingPill.tsx`

## Variants

| `mode`      | Content                                                  |
| ----------- | -------------------------------------------------------- |
| `recording` | Red pulsing dot, clock, "Pause", "Stop"                  |
| `paused`    | Hollow dot, frozen clock, "Resume", "Stop"               |
| `finishing` | [`LoadingDots`](loading-dots.md) "Finishing transcript…" |

## Sizes

| Size    | Height | Padding              | Typography                                             |
| ------- | ------ | -------------------- | ------------------------------------------------------ |
| default | 48px   | 20px left, 6px right | Clock: mono 16px / 500; buttons: `{typography.button}` |

## Tokens

- Background: `{colors.primary}`, text `{colors.on-primary}` (inverts in dark mode)
- Recording dot: `{colors.semantic-error}`, 10px, pulsing
- Paused dot: 10px ring of `on-primary` at 50%
- Dividers: 1px × 20px, `on-primary` at 25%
- Radius: `{rounded.full}`; inner buttons are 36px pills

## States

- **Hover:** inner button gets an `on-primary` 10% background.
- **Focus:** 2px `on-primary` ring on the inner button.
- **Reduced motion:** the red dot stops pulsing.
- **Screen readers:** the clock is read as "Recording, 00:42:39" or "Paused, …".

## Usage

```tsx
<RecordingPill
  mode="recording"
  elapsedMs={elapsedMs}
  onPause={pause}
  onResume={resume}
  onStop={stop}
/>
```

## Do's and Don'ts

- Do keep it the only red on the page.
- Don't show it once the note is ready.
