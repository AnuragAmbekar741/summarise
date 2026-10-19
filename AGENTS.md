# Agent guidelines

- Read [docs/README.md](docs/README.md) first, then the plan for the current stage in [docs/plans/](docs/plans/). Current stage: [stage 0, proof](docs/plans/stage-0-proof.md).
- Work happens on the stage branch (`stage-N-<name>`); one commit per task step; everything reaches `main` through a PR.
- Python deps: `uv add --package <member> <dep>` only; never hand-edit dependency lists. Sync with `uv sync --all-packages`.
- Frontend: `apps/web` (pnpm, not a uv member). Deps: `pnpm add` inside `apps/web` only.
- Before committing: `make lint` and `make test`.
- Secrets live in `.env` (gitignored). Never print, log or commit key values.
