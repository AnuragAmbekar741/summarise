# Notes harness: model comparison results

Eval runs from 2026-11-14 on a 1-hour lecture (cs207 lecture 3, 121 segments, 7 extraction windows), using the `compare` and `rewrite` commands in `apps/evals`. Run output is in `apps/evals/runs/` (gitignored, local only).

The paid models we planned to compare (Opus 5.5, Haiku 5.5, Kimi K3, DeepSeek V4 Pro, gpt-oss-120b on Groq) haven't run yet: both keys failed (no Anthropic credit, OpenRouter `401 User not found`). These results use free models only.

## Extraction: free OpenRouter models

| | ERNIE 5.5 Flash | Nemotron 3.5 Super |
|---|---|---|
| Windows extracted | 7/7 | 7/7 |
| Schema failures | 0 | 0 |
| Quotes verified | 279 of 285 (98%) | 128 of 128 (100%) |
| Items dropped (no quote found) | 1 | 0 |
| Transcript covered | 93% | 65% |
| Assignments found | 3 | 4 |
| Time | 110 s | 240 s |
| Cost | $0 | $0 |

Both free models extract well. ERNIE covers much more of the lecture.

## Synthesis: free models fail

Both models spent ~10,000 output tokens, mostly hidden reasoning, then returned almost nothing:

- ERNIE: blank title, every list empty.
- Nemotron: a title, a short overview and one topic; no definitions or questions.

The JSON still matched the schema, because empty lists were allowed. **A valid schema doesn't mean useful notes.** The schema now rejects a document with no title, overview, topics or review questions, so empty output gets the repair attempt and then counts as a failure.

Why: extraction is many small calls (~3,000 tokens of transcript each). Synthesis is one big call (~180 items, ~19,000 tokens) that must merge, order and write a long structured document. Small models are weak at one long, many-part output.

Options, cheapest first:

1. Make synthesis smaller: drop the already-checked quotes, cap unclear passages, split into several short calls, let code merge duplicates.
2. Use a stronger model for synthesis only ("cheap extract, strong synthesis").

## Cheap extract, strong synthesis

The `rewrite` command writes notes from an earlier run's verified items, so a synthesis model can be tried for 1 request. Gemini 4 Hydrogen (free tier) on the saved items:

| Notes from… | Topics (points) | Definitions | Examples | Assignments | Review questions | Check-with-lecturer | Time | Repair needed |
|---|---|---|---|---|---|---|---|---|
| ERNIE's items (180) | 8 (33) | 30 | 13 | 3 | 7 | 5 | 120 s | no |
| Nemotron's items (122) | 7 (31) | 23 | 19 | 4 | 8 | 8 | 64 s | no |

The ERNIE-based notes:

- Follow the lecture in order, with a timestamp on every line.
- Get the real assignments (problems A, B, C and bonus D) with no invented deadlines. One entry is borderline: the lecturer pointing at a homework topic rather than setting a task.
- Catch useful details, like what won't be on the exam.
- Weaknesses: too many trivial definitions; one example with an unrealistic number worth checking against the transcript.

**Best setup so far: ERNIE 5.5 Flash extracts, Gemini 4 Hydrogen writes the notes, at $0.**

## Reading by hand still matters

Metrics alone missed this: of Nemotron's 4 extracted assignments, all had real quotes, but only some were homework. "In lab, connect positive to positive…" describes lab work, and "this is on your homework" points at a topic. Hand-labelled assignments per lecture let the eval score assignment precision and recall automatically.
