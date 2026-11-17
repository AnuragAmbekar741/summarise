# Notes harness: model access and cost

Research from 2026-11-14 on which models we can call for the eval comparison, what's free, and what paid testing would cost. Prices and free limits change often; check them again before relying on these numbers.

## Paid testing cost

Estimated from real token counts on a 1-hour lecture (two free models that reason a lot, so treat it as within about 2×):

- **1-hour lecture:** ~35k input and ~70k output tokens (extraction ~14k in / 50–65k out over 7 windows; synthesis ~11–19k in / 10k out).
- **2.5-hour lecture:** ~90k in and ~175k out, in about 20 calls. Output tokens dominate the cost.

| Model (OpenRouter) | Price per M (in / out) | One 2.5 h lecture | 20 lectures, 3 h each |
|---|---|---|---|
| DeepSeek V4.1 Flash | $0.05 / $0.20 | ~$0.04 | ~$1 |
| Claude Haiku 5.5 | $0.10 / $0.50 | ~$0.10 | ~$2.50 |
| gpt-oss-120b | $0.15 / $0.60 | ~$0.12 | ~$3 |
| DeepSeek V4 Pro | ~$1 / ~$2 | ~$0.45 | ~$10 |
| Kimi K2.6 | $0.65 / $3.41 | ~$0.65 | ~$16 |
| Kimi K3 | ~$3 / ~$15 | ~$2.90 | ~$70 |
| Claude Opus 5.5 | $4 / $20 | ~$3.90 | ~$95 |

Takeaways:

- About **$20 of OpenRouter credit** covers 15–20 long lectures on the cheap models, with room for a few reruns.
- Run the expensive models (Kimi K3, Opus) on only 2–3 lectures, as a quality bar.
- Iterate prompts on 3–5 lectures; run the full set only for the final comparison.

## OpenRouter notes

- One adapter covers every model OpenRouter serves.
- The same model can be served by several hosts, and only some enforce a JSON schema. Others may return valid JSON in the wrong shape or hang. **Pin hosts that support strict schemas and always Zod-validate.** ([guide](https://aireiter.com/pt/blog/openrouter-structured-output-guide))
- Free models (`:free`) still need an account key. Without ever buying credit: **50 requests a day**, 20 a minute. After a one-time $10 purchase: 1,000 a day. Failed calls count. ([pricing](https://openrouter.ai/pricing), [rate limits](https://openrouter.zendesk.com/hc/en-us/articles/39501163636379-OpenRouter-Rate-Limits-What-You-Need-to-Know))
- On 2026-11-14 the free list had 17 models, none of them Kimi or DeepSeek. Free models with JSON-schema support: Ling 3.2 Flash, ERNIE 5.5 Flash (preview), Nemotron 3.5 Super, plus the `openrouter/free` router.
- Hosts of free models may log prompts or train on them.

## Free options

| Option | What you get | Catch |
|---|---|---|
| **Groq free tier** | gpt-oss-120b, gpt-oss-20b, Qwen 3.8 27B. ~30 req/min, 1,000/day, **8,000 tokens/min** (third-party numbers) | A single synthesis call can exceed 8k tokens |
| **Gemini API free tier (AI Studio)** | Flash and Flash-Lite models, plus Gemini 4 Hydrogen | **20 requests per model per day** (seen in a 429), failed attempts count, resets at midnight Pacific; prompts may be used for training |
| **OpenRouter `:free`** | Small open models (see above) | 50 requests/day without credit |
| **Puter.js** | 500+ models incl. Claude and GPT, with JSON-schema output | "User-pays": in Node it spends your own account's unpublished free allowance, likely 1–2 runs |
| **Anthropic signup credit** | Reportedly ~$5 on a new account after SMS check (unverified) | ~3 Opus or ~50 Haiku runs of a 1-hour lecture |
| **GitHub Models** | GPT and other models | ~8k input / 4k output tokens per request, 50–150 req/day, prototyping only |

Free Gemini text models (from Google's pricing page): `gemini-4-hydrogen`, `gemini-3.8-flash`, `gemini-3.6-flash`, `gemini-3-flash-preview`, `gemini-3.5-flash-lite`, `gemini-3.1-flash-lite`, and the retiring 2.5 models. Not free: Gemini 4 Carbon, Gemini 4 Argon, Gemini 3.1 Pro Preview.

Not useful right now:

- **Google Cloud $300 trial:** doesn't cover Claude, and stops covering Gemini on Vertex for sign-ups from 2026-11-16.
- **Anthropic startup program:** reported paused since early October 2026.
- **Kimi and DeepSeek direct:** no reliable free credit, but cheap to pay for.

Sources: [Groq pricing](https://www.groq.com/pricing), [Groq limits thread](https://community.groq.com/t/what-are-the-rate-limits-for-the-groq-api-for-the-free-and-dev-tier-plans/42), [Gemini API pricing](https://aistudio.google.com/docs/pricing), [Gemini free tier (apidog)](https://apidog.com/blog/gemini-api-free-tier/), [Puter user-pays model](https://docs.puter.com/user-pays-model/), [Puter chat docs](https://docs.puter.com/AI/chat/), [GitHub Models review](https://toolchew.com/en/review-github-models-2026/), [Google Cloud free program](https://docs.cloud.google.com/free/docs/free-cloud-features), [OpenRouter free APIs compared](https://openrouter.ai/blog/tutorials/free-llm-apis-compared/)

## Lessons from using the free tiers

- **Retries can burn a daily quota.** Retrying Gemini's 503 "high demand" errors up to 8 times used up Flash's 20 requests before any answer came back. Gemini now retries once.
- **Free OpenRouter models can hang.** A Ling run hung for over 25 minutes and was stopped.
- A 2–3 hour lecture needs ~18–25 requests, more than one Gemini model's daily free quota.
