# Pages

One file per page, named after its route in kebab-case (`sign-in.md`,
`sign-up.md`). Every page in `apps/web/src/pages/` has a doc here, added in the
same commit as the code. Tokens come from [`../design.md`](../design.md);
components come from [`../components/`](../components/).

## Template

```md
# <Page name>

<One or two sentences: what the page is for.>

**Route:** `/...`
**Source:** `apps/web/src/pages/...`

## Layout

Structure from top to bottom, widths, alignment, and how it collapses on
mobile.

## Components

| Component | Variant | Where |
| --------- | ------- | ----- |

## Typography & spacing

Which type tokens are used for each piece of text, and the spacing between
blocks.

## Atmosphere

Which gradient orbs appear, where, and their size.

## Copy

Exact headings, labels, placeholders and button text.

## States

Loading, empty, error, and success states.
```
