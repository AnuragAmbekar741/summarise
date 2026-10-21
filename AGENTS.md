# Agent guidelines

- Everything reaches `main` through a PR from a feature branch.
- Commits: several small, meaningful commits per task, one logical step each, never one commit for a whole task. Each builds and passes tests on its own.
- Commit messages: conventional prefix and scope, imperative subject of about 50 characters or less, e.g. `feat(speech): add groq client`. No body unless the why isn't obvious.
- Secrets live in `.env` (gitignored). Never print, log or commit key values.
