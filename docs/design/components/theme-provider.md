# Theme provider

Decides between light and dark. It follows the system setting until the user
presses **D**, which switches between the two and remembers the choice. It
draws nothing itself.

**Source:** `apps/web/src/components/theme/ThemeProvider.tsx`, mounted once in
`apps/web/src/app/main.tsx`. Read it with `useTheme()`.

## Variants

| `theme`  | On screen            | When                         |
| -------- | -------------------- | ---------------------------- |
| `system` | Follows the OS, live | Default, before D is pressed |
| `dark`   | Dark                 | After D, from light          |
| `light`  | Light                | After D, from dark           |

## Behaviour

- **The D key** works on every page. It is ignored while typing in an input,
  textarea, select or editable area, with Cmd, Ctrl or Alt held, and while the
  key repeats.
- **Remembered:** the choice is saved in `localStorage` under `theme`. If
  storage is blocked, the theme still changes for the visit.
- **No flash:** a script in `index.html` applies the saved choice before
  React loads.
- **Instant switch:** transitions are turned off for the frame the colours
  change, so nothing fades between themes.
- **All tabs:** pressing D in one tab switches every open tab.

## Tokens

None of its own. It only toggles the `.dark` class on `<html>`; every token
switches with it (see [`design.md`](../design.md)).

## Usage

```tsx
const { theme, resolvedTheme, setTheme } = useTheme();
```

`resolvedTheme` is what's on screen (`'dark'` or `'light'`); pass it to
anything that needs the theme, like the [toaster](toaster.md).
