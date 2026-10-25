# CLAUDE.md

- Do only what I ask. Nothing extra: no added features, docs, plans or suggestions I didn't ask for.
- If something is unclear, ask before doing it.
- Commit after each step. Short, meaningful message, e.g. `chore: add pnpm workspace`.
- Never edit `package.json` or the lockfile by hand. Always use pnpm commands (`pnpm add`, `pnpm remove`, `pnpm pkg set`, …).
- Never write migration files by hand. Always generate them with the drizzle commands (`pnpm --filter @summarise/storage generate`).
