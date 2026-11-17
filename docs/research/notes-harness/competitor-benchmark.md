# Notes harness: benchmarking against other note tools

Research and a first comparison from 2026-11-15/16 on how to compare our notes with tools like Granola and Notion AI.

## How to benchmark

Give every tool the **same lecture**, save the notes each produces, and score them the same way, ideally without knowing which tool wrote which.

### Which tools

- **Granola** fits: it turns a meeting into AI notes.
- **Wispr Flow** doesn't: it's a dictation tool and doesn't write notes.
- Closer matches for lectures: **Otter**, **Notion AI meeting notes**, and student apps like **Coconote** or **TurboLearn** (upload support not yet checked).

### Getting the lecture in

- Granola reportedly can't import audio files; it records live. Play the recording on the Mac while Granola records.
- Tools with file upload can take the recording directly.
- Granola's copy button gives the notes as Markdown.
- Use your own accounts and recordings, and keep competitor notes for internal benchmarking only.

Sources: [Audionotes vs Granola](https://www.audionotes.app/compare/audionotes-vs-granola), [Granola review](https://marketcorrect-com.pages.dev/reviews/granola), [Granola transcripts guide](https://www.layer3labs.io/guides/granola-transcripts), [Granola vs Notion AI](https://zackproser.com/blog/granola-vs-notion-ai-meetings)

### Scoring, cheapest first

Speech-to-text differs between tools, so score **the notes**, using one transcript as the reference. Best of all: run our pipeline on the **competitor's own transcript**, so only the notes step differs.

1. **Answer key.** Hand-label each lecture once (real assignments, key terms, main topics), then count found vs. invented for every tool.
2. **Grounding.** Split notes into claims and have a model check each against the transcript, giving an invented-content rate.
3. **Blind A/B judging.** A judge sees notes "A" and "B" plus a rubric (coverage, correctness, organisation, usefulness for studying). Run each pair twice with A/B swapped, since judges favour the first. The judge must not be a model that wrote any of the notes.
4. **Human blind review** by students. Strongest signal.

## First comparison: Notion AI on H 632

Notion's export included its own transcript (200 paragraphs, ~10,300 words, no timestamps). We ran our pipeline on that same transcript with `compare --transcript <file>`: ERNIE 5.5 Flash extracts (11 windows), Gemini 4 Hydrogen writes the notes.

Run: 11/11 windows, no schema failures, 571 of 576 quotes found word for word, 91% of the transcript cited, 3.5 minutes, $0.

| | Notion | Ours (synthesize.v1) |
|---|---|---|
| Length | ~45 bullets, 9 sections | 11 sections, 53 definitions, 14 examples (186 lines) |
| Coverage | Main ideas | Main ideas plus points Notion dropped |
| Assignments | 2, one of them an offer ("email me for the article") | 1, the real one |
| Review questions | None | 8 |
| Flags misheard words | No | Yes, under "Check with the lecturer" |
| Reliability cutoffs | Correct (0.8 / 0.7 / ~0.6) | Missed 0.8 = excellent |
| Easy to read | Better | Thorough but long |
| Evidence per point | None | Blank (transcript had no times) |

What ours got wrong:

- Too long, with many trivial definitions.
- Missed the 0.8 cutoff by treating a spoken self-correction as a contradiction.
- Invented a name ("Ramundsen") that appears nowhere in the transcript.
- No way to trace lines back when the transcript has no times.

Notion broke our rule that an offer is never an assignment (PRD FR13); ours didn't.

## Tightened notes prompt (synthesize.v2)

Changes to the notes step only:

- 4–6 key takeaways at the top.
- 10–15 definitions, up to 8 examples, at most 5 grouped unclear passages.
- Spoken self-corrections are resolved instead of flagged.
- Offers are never turned into assignments.
- Names are copied exactly from the items, never respelled.
- Paragraph references like `[¶42]` when a transcript has no times.

Rewritten from the same H 632 items with Gemini 4 Hydrogen (1 request, schema passed first try):

| | v1 | v2 |
|---|---|---|
| Length | 186 lines | 127 lines (32% shorter) |
| Key takeaways | none | 5 |
| Topics / points | 11 / ~45 | 9 / 36 |
| Definitions | 53 | 14 |
| Examples | 14 | 8 |
| Check with the lecturer | 6 long entries | 5 grouped entries |
| Line references | blank | `[¶72, ¶80]` style |
| 0.8 reliability cutoff | missed | correct |

Still wrong: the invented "Ramundsen" name. It comes from ERNIE's **extraction** step, so v2 copied it faithfully (and flagged it). The fix is the same "never respell names" rule in the extraction prompt, which needs a fresh extraction run to check.
