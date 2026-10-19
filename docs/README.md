# Summarise documentation

Lecture Study Assistant: records a lecture in the browser, shows a near-live transcript, and produces evidence-linked study notes published to Notion.

The product requirements live in the PRD doc: [Lecture Study Assistant — Final PRD and Implementation Plan](https://claude.ai/code/artifact/14eeca85-3022-4d8a-a916-16c93e005b6e). This folder holds what we build from it, stage by stage.

## How we work

Every stage follows the same loop:

1. **Plan.** Write `plans/stage-N-<name>.md`: goal, scope, tasks with files and acceptance checks, exit gate.
2. **Review.** Read the plan, answer its open decisions, mark it `Approved`.
3. **Execute.** On a branch `stage-N-<name>` cut from `main`, build task by task. Each task ends with its acceptance check passing and its own commit.
4. **Pull request.** Open a PR from the stage branch to `main` titled `Stage N: <name>`. The description links the plan, lists the tasks done and the gate results. Nothing lands on `main` without a PR.
5. **Close.** Fill in the plan's `Outcome` section in the same PR: what shipped, gate results, what changed from the plan, what the next stage must know. Merge after review.

A stage never starts until the previous stage's gate has passed or been explicitly waived in its `Outcome`.

## Folders

| Folder | Use |
|---|---|
| [plans/](./plans/) | One implementation plan per stage |
| [decisions/](./decisions/) | Short records of choices made with evidence (provider, models, pricing) |

## Stages

| Stage | Plan | Status |
|---|---|---|
| 0 Proof | [plans/stage-0-proof.md](./plans/stage-0-proof.md) | Approved, not started |
| 1 Foundation | not written | |
| 2 Capture | not written | |
| 3 Notes | not written | |
| 4 Resources and Notion | not written | |
| 5 Pilot readiness | not written | |
