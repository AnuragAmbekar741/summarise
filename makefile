.PHONY: help setup api web dev test test-live lint eval-reference eval-transcript

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

# Draft a reference window to correct by hand:
# make eval-reference LECTURE=<slug> SESSION=<id> START=12:00 END=22:00
eval-reference:
	@test -n "$(LECTURE)" -a -n "$(SESSION)" -a -n "$(START)" -a -n "$(END)" || (echo 'Usage: make eval-reference LECTURE=<slug> SESSION=<id> START=mm:ss END=mm:ss' && exit 1)
	uv run --package evals python -m evals.reference --lecture $(LECTURE) --session $(SESSION) --start $(START) --end $(END) $(ARGS)

# Compare providers on a labelled lecture (costs money on first run; cached after):
# make eval-transcript LECTURE=<slug> [ARGS="--configs groq-turbo-chunks,groq-v3-chunks --fresh"]
eval-transcript:
	@test -n "$(LECTURE)" || (echo 'Usage: make eval-transcript LECTURE=<slug>' && exit 1)
	uv run --package evals python -m evals.transcript --lecture $(LECTURE) $(ARGS)
