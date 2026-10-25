# Account menu

The account icon at the top right. It opens a menu with the signed-in user's
name and email, and "Log out".

**Source:** `apps/web/src/components/common/AccountMenu.tsx`

## Variants

| Variant   | Trigger                                                | Menu                              |
| --------- | ------------------------------------------------------ | --------------------------------- |
| (default) | Lucide `CircleUserRound`, 20px, in a 40px round button | Name, email, separator, "Log out" |

## Tokens

- Trigger: ink icon; `{colors.surface-strong}` background on hover
- Menu: [`DropdownMenu`](dropdown-menu.md), 224px wide, right-aligned to the
  trigger
- Name: `{typography.body-sm}` / 500, ink; email: `{typography.caption}`, muted

## States

- **Focus:** 2px ring on the trigger.
- **Logging out:** the item reads "Logging out…" and is disabled.
- **Dark mode:** follows the tokens.

## Usage

```tsx
<AccountMenu />
```
