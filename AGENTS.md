# Agent guidelines

- Read [docs/README.md](docs/README.md) first, then the plan for the current stage in [docs/plans/](docs/plans/). Current stage: [stage 0, proof](docs/plans/stage-0-proof.md).
- Work happens on the stage branch (`stage-N-<name>`); everything reaches `main` through a PR.
- Commits: several small, meaningful commits per task, one logical step each (package setup, client, filters, tests), never one commit for a whole task. Each builds and passes tests on its own.
- Commit messages: conventional prefix and scope, imperative subject of about 50 characters or less, e.g. `feat(speech): add groq client`. No body unless the why isn't obvious.
- Python deps: `uv add --package <member> <dep>` only; never hand-edit dependency lists. Sync with `uv sync --all-packages`.
- Frontend: `apps/web` (pnpm, not a uv member). Deps: `pnpm add` inside `apps/web` only.
- Before committing: `make lint` and `make test`.
- Secrets live in `.env` (gitignored). Never print, log or commit key values.
