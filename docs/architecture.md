# Architecture

Summarise is a monorepo built with pnpm workspaces. Runnable code lives in
`apps/`, shared code lives in `library/`.

## Folder structure

```
apps/
  web        React frontend
  service    Express API
  worker     background jobs
library/
  config     reads and validates env vars (.env)
  logger     shared pino logger
  contract   Zod request/response schemas
  storage    Drizzle tables, migrations, db client
  queue      Redis connection, job types, enqueue + consume helpers
```

## How they connect

```
web ──HTTP──▶ service ──enqueue──▶ Redis ──consume──▶ worker
                 │                                  │
                 └──────────▶ Postgres ◀────────────┘
```

| App     | Uses                                               |
| ------- | -------------------------------------------------- |
| web     | `contract`                                         |
| service | `contract`, `storage`, `queue`, `config`, `logger` |
| worker  | `storage`, `queue`, `config`, `logger`             |

Apps never import other apps. They share code only through `library/`.

## Libraries

- **config**: one place that reads `.env` and validates it. A missing
  variable fails at startup.
- **logger**: one pino logger for backend code, instead of `console`. Readable
  lines in development, JSON in production.
- **contract**: request and response shapes, defined once as Zod schemas.
  `service` validates incoming requests with them, and `web` types its calls
  with them. Change a field and both sides fail typecheck until fixed.
- **storage**: Postgres tables and queries. Shared by `service` and `worker`.
- **queue**: sending and receiving jobs on Redis. `service` enqueues, `worker`
  consumes. Job payloads live here, so both sides agree on the shape.

Each shape has one home: HTTP shapes in `contract`, tables in `storage`, job
payloads in `queue`.

## Module structure

A module (e.g. `lecture`, `auth`) has the same name everywhere:

```
apps/service/src/modules/lecture/
  lecture.routes.ts        Express router: paths + validation
  lecture.controller.ts    reads req, calls service, sends res
  lecture.service.ts       business logic

apps/worker/src/jobs/transcribe-chunk/
  transcribe-chunk.handler.ts

apps/web/src/
  pages/LecturePage.tsx
  components/LectureCard.tsx
  hooks/useLectures.ts
  api/lecture/lecture.api.ts     axios calls

library/contract/src/
  lecture/lecture.schema.ts
  auth/auth.schema.ts
  common/error.schema.ts         shared error response
  index.ts                       re-exports everything

library/storage/src/lecture/
  lecture.table.ts
  lecture.repository.ts

library/queue/src/transcribe-chunk/
  transcribe-chunk.job.ts        job name + payload schema

library/config/src/
  config.schema.ts               every env key
```

Apps import libraries from the package root:

```ts
import { CreateLectureSchema, type Lecture } from '@summarise/contract';
```

## Naming conventions

| Thing                  | Convention                                  | Example                                      |
| ---------------------- | ------------------------------------------- | -------------------------------------------- |
| Folders                | kebab-case, singular                        | `lecture/`, `transcript-segment/`            |
| Backend/library files  | `<module>.<role>.ts`                        | `lecture.service.ts`                         |
| React components       | `PascalCase.tsx`                            | `LectureCard.tsx`                            |
| React hooks            | `useXyz.ts`                                 | `useLectures.ts`                             |
| Package names          | `@summarise/<name>`                         | `@summarise/storage`                         |
| Types                  | PascalCase                                  | `Lecture`                                    |
| Zod schemas            | PascalCase ending in `Schema`               | `LectureSchema`                              |
| Request schemas        | `<Action><Thing>Schema`                     | `CreateLectureSchema`                        |
| Params / query schemas | `<Thing>ParamsSchema`, `<Thing>QuerySchema` | `LectureParamsSchema`                        |
| Functions, variables   | camelCase                                   | `createLecture`                              |
| Constants, env keys    | SCREAMING_SNAKE_CASE                        | `DATABASE_URL`                               |
| Tables                 | TS camelCase plural, SQL snake_case plural  | `transcriptSegments` / `transcript_segments` |

File roles: `.routes` `.controller` `.service` `.schema` `.table`
`.repository` `.job` `.handler` `.client` `.types` `.constants` `.utils`
`.spec` `.int.spec`

## Rules

- Never edit `package.json` or `pnpm-lock.yaml` by hand. Use pnpm commands
  (`pnpm add`, `pnpm remove`, `pnpm pkg set`, …).
