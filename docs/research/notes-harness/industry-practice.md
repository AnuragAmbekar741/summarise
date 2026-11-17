# Notes harness: industry practice

Research from 2026-11-14, done before building the harness that turns transcripts into notes. It covers how teams build and evaluate LLM pipelines that summarise long transcripts, and the design we took from it.

Most of the eval sources are practitioner or vendor blogs, so treat their numbers as rules of thumb, not standards.

## Findings

### Fixed workflows over agents

For a task whose steps are known in advance, use a fixed workflow with checks in code between model calls, not an agent that decides what runs next. Anthropic calls this pattern *prompt chaining*. A generate → critique loop ("evaluator-optimizer") is worth adding only if evals show it helps.

- [Anthropic, Building effective agents](https://www.anthropic.com/engineering/building-effective-agents)

### Split long transcripts, then combine

- Cut at natural boundaries and overlap the pieces slightly.
- Repeatedly merging summaries (summaries of summaries) **makes hallucinations worse**.
- In the same study, model-written citations were the weakest of the fixes tried. Checking quotes in code is more reliable than trusting the model's citations.
- Errors pile up **late in long outputs**, so keep each call's output short.

Sources: [Ou & Lapata, ACL Findings 2025](https://preview.aclanthology.org/setup/2025.findings-acl.289), [Hallucinate at the Last](https://arxiv.org/html/2505.15291v3), [Galileo on summarisation](https://galileo.ai/blog/llm-summarization-strategies), [Soniox](https://soniox.com/wiki/conversation-summarization)

### Ground every point

Each point should carry a timestamp and word-for-word text, especially high-stakes facts like deadlines. Use named fields, not prose.

### Evals in layers

- A golden set built from real data, starting with 50–100 cases (for us: many items across a few lectures).
- Every production failure is added back to the set.
- Cheap code checks on every change; LLM judges before a release.
- Judges are calibrated against human labels.
- Judge prompt, rubric and dataset are versioned together.

Sources: [dev.to field guide](https://dev.to/lamingsrb/llm-evals-in-2026-a-practitioners-field-guide-26if), [catching regressions](https://techearl.com/how-to-write-llm-evals-that-catch-regressions), [LLM-as-judge practices](https://futureagi.com/blog/llm-as-judge-best-practices-2026), [Mastra](https://mastra.ai/articles/llm-evaluation), [eval pipeline 2026](https://dev.to/moksh/how-to-build-an-llm-eval-pipeline-for-your-ai-app-in-2026-4f2b)

### Tooling

- **Langfuse:** open source tracing, prompt versions and datasets, with a TypeScript SDK built on OpenTelemetry. Suited to production traces.
- **Promptfoo:** for testing prompts before release.

We start with our own `llm_calls` trace and eval CLI to learn the mechanics, and switch to Langfuse if the home-made version starts to hurt.

- [Langfuse vs Promptfoo](https://respan.ai/market-map/compare/langfuse-vs-promptfoo), [Langfuse guide](https://qaskills.sh/blog/langfuse-llm-observability-guide-2026)

## Design we took from it

A fixed 5-step pipeline:

```
transcript_segments ──▶ 1 Assemble ──▶ 2 Extract (one call per window)
                                              │
                                              ▼
                        5 Render ◀── 4 Synthesise ◀── 3 Verify (code, no model)
```

1. **Assemble (code).** Segments in order, `editedText ?? rawText`, gaps shown as `[GAP mm:ss–mm:ss]`, each line with a citable ID like `[s42 @ 21:03]`.
2. **Extract (one call per ~10 min window).** Windows overlap by one segment. Every item gives its segment IDs and a short verbatim quote.
3. **Verify (code).** Each quote is checked against its segment (verified, partial or not found). Items with no quote found are dropped.
4. **Synthesise (one call).** Works from the verified items, never from window summaries. Every point links back to its items.
5. **Validate and render (code).** Zod checks the output, with one repair attempt. Markdown is built from the JSON in code.

How we understand what the model produced, cheapest first:

1. **Typed output.** A Zod schema for every step.
2. **Evidence on every claim.** Segment IDs, timestamp and quote.
3. **A saved trace of every call:** step, prompt version, model, input, raw output, parse result, tokens, cost, latency.
4. **Evals.** A golden set with hand-written answers (assignments, key terms, topics); deterministic checks (schema valid, quotes found, assignment precision and recall, key terms present, transcript coverage); an LLM judge for what code can't check, calibrated against ~20 human labels; side-by-side reports when a prompt changes.

Prompts are versioned files, and each generation records the version it used.
