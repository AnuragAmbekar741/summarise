# web

React + Vite + Tailwind. Stage 0 is a single proof page; the capture code lives in `src/capture/`.

- `make web` runs Vite on 5173 and proxies `/api` and `/health` to the API on 8000.
- `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build`.

Dependencies: `pnpm add` inside this folder only.
