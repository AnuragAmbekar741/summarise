# Components

One file per component, named after it in kebab-case (`button.md`,
`text-input.md`). Every component in `apps/web/src/components/` has a doc here,
added in the same commit as the code. Tokens come from
[`../design.md`](../design.md); reference them, never inline hex.

## Template

```md
# <Component name>

<One or two sentences: what it is and when to use it.>

**Source:** `apps/web/src/components/...`

## Variants

| Variant | Background | Text | Border | Use |
| ------- | ---------- | ---- | ------ | --- |

## Sizes

| Size | Height | Padding | Typography |
| ---- | ------ | ------- | ---------- |

## Tokens

- Typography: `{typography.*}`
- Radius: `{rounded.*}`
- Colors: `{colors.*}`

## States

Hover, active, focus, disabled, error, and how each looks in dark mode.

## Usage

<Short code example.>

## Do's and Don'ts

- Do ...
- Don't ...
```
