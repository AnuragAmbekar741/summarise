# OR divider

A hairline with "OR" in the middle, separating two alternative ways to do the
same thing (Google vs email).

**Source:** `apps/web/src/components/common/OrDivider.tsx`

## Variants

| Variant   | Lines                   | Text                                                     | Use                  |
| --------- | ----------------------- | -------------------------------------------------------- | -------------------- |
| (default) | 1px `{colors.hairline}` | "OR", `{typography.caption-uppercase}`, `{colors.muted}` | Between auth options |

## Sizes

Full width of its container. 16px gap between each line and the text. The page
adds 24px above and below.

## Tokens

- Typography: `{typography.caption-uppercase}` (12px / 600 / +0.96px, uppercase)
- Colors: `{colors.hairline}`, `{colors.muted}`

## States

- **Dark mode:** lines `#292524`, text `#a8a29e`.

## Usage

```tsx
<div className="my-6">
  <OrDivider />
</div>
```

## Do's and Don'ts

- Do use it only between two equal alternatives.
- Don't use it as a general section divider; use a plain hairline.
