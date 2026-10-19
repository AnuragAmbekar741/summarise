.PHONY: help setup api web dev test test-live lint eval-transcript

# List targets
help:
	@grep -E '^[a-zA-Z_-]+:' $(firstword $(MAKEFILE_LIST)) | cut -d: -f1 | sort

# Install Python and web dependencies; create .env from the example if missing
setup:
	cp -n .env.example .env || true
	uv sync --all-packages
	pnpm --dir apps/web install

# API on http://127.0.0.1:8000 (/health, /docs)
api:
	uv run --directory apps/api fastapi dev --host 127.0.0.1 --port 8000

# Vite on http://localhost:5173, proxying /api and /health to the API
web:
	pnpm --dir apps/web dev

dev:
	$(MAKE) -j2 api web

test:
	uv run pytest -q
	pnpm --dir apps/web test

# Real provider calls (Groq, AssemblyAI); needs keys in .env, costs under a cent
test-live:
	uv run pytest -q -m live

lint:
	uv run ruff check .
	uv run ruff format --check apps packages evals
	pnpm --dir apps/web lint
	pnpm --dir apps/web typecheck

# Compare providers on a recorded lecture: make eval-transcript LECTURE=<slug> SESSION=<id>
eval-transcript:
	@test -n "$(LECTURE)" -a -n "$(SESSION)" || (echo 'Usage: make eval-transcript LECTURE=<slug> SESSION=<id>' && exit 1)
	uv run --package evals python -m evals.transcript --lecture $(LECTURE) --session $(SESSION)
