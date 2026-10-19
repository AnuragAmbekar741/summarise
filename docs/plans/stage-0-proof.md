# Stage 0: Proof

**Status:** Approved 2026-10-18, all open decisions resolved to option (a)
**Estimate:** 5 to 7 working days, plus one real lecture to record
**Depends on:** nothing

## Goal

Prove, with real classroom audio, that the capture design works before building the app around it. Stage 0 answers five questions; each has a measurable answer in the exit gate.

| # | Question | Why it can sink the product |
|---|---|---|
| Q1 | Is a laptop microphone in a real lecture room good enough for Whisper? | Bad audio cannot be fixed downstream |
| Q2 | Do silence-based cuts split cleanly on real speech, without cutting words? | Mid-word cuts mean overlap and dedupe logic we chose not to build |
| Q3 | Is the lag from speech to text on screen under 60 s? | The near-live transcript is the main thing the student sees during class |
| Q4 | Does a 3 h browser session survive Wi-Fi drops, a hidden tab and battery power without losing audio? | Lost audio is the one failure students will not forgive |
| Q5 | Which transcription provider and model should we use, and what does an hour cost? | Sets accuracy and about 15% of the per-lecture cost |

## Scope

### In

- Repo scaffold in `~/dev/summarise`, following Kosh conventions (uv workspace, pnpm web app, makefile).
- A single-page web app: microphone picker, level meter, start, pause, stop, transcript list, debug panel.
- The real capture module: recorder, silence cutter, wake lock, IndexedDB (Dexie) chunk store, upload queue. This code carries into stage 2 unchanged in shape.
- A FastAPI app with one proof router: create session, upload chunk, list segments. It calls Groq inside the request and saves chunks to local disk.
- `packages/speech`: the Groq client and segment filtering. Carries into later stages.
- `evals`: a transcript suite comparing providers on the recorded lecture.
- One real lecture recorded, a 10-minute reference transcript, and a written provider decision.

### Out

Database, auth, worker, R2, notes generation, Notion, deployment, styling beyond a usable layout, Safari and Firefox support (tested once, not fixed).

### Deliberate shortcuts (removed in stage 2)

| Shortcut in stage 0 | Replaced by |
|---|---|
| Groq called inside `POST /chunks` | `transcribe_chunk` worker job |
| Chunks and segments stored as files under `.data/` | R2 objects and Postgres rows |
| No auth; API listens on `127.0.0.1` only | Google sign-in |
| Upload response returns the segments | Upload returns `202`; browser polls `GET /segments` |

Keeping the upload response synchronous makes lag measurement exact and removes a polling loop we would throw away.

## Inputs needed from you

- [ ] Groq API key (developer tier is enough for one user).
- [ ] AssemblyAI API key, for the comparison run only (new accounts get free credit).
- [ ] A lecture you are allowed to record, at least 60 minutes, ideally 3 h. Confirm the course or university recording policy first.
- [ ] A list of 20 to 40 technical terms from that course, for vocabulary recall scoring.
- [ ] 45 to 60 minutes to correct a 10-minute excerpt of the transcript by hand.
- [ ] `brew install ffmpeg` (used by the eval to join chunks and measure audio).

## Repo after stage 0

```text
summarise/
  .gitignore
  .python-version          # 3.14, same as Kosh
  .env.example             # GROQ_API_KEY, ASSEMBLYAI_API_KEY, DATA_DIR, WEB_ORIGIN
  pyproject.toml           # uv workspace root: members apps/api, packages/speech, evals; dev group
  uv.lock
  makefile                 # setup, api, web, dev, test, eval-transcript, help
  AGENTS.md
  docs/
    README.md
    plans/stage-0-proof.md
    decisions/0001-speech-provider.md      # written at the end of the stage
  apps/
    api/
      pyproject.toml       # fastapi[standard], python-multipart, speech
      src/api/
        main.py            # app, CORS, routers
        settings.py        # pydantic-settings
        modules/proof/
          router.py
          schemas.py
          service.py       # file storage + speech call + timing
      tests/
        test_proof.py      # speech client faked
    web/
      package.json         # react, react-dom, dexie, vite, typescript, vitest, tailwind
      index.html
      vite.config.ts       # proxy /api -> 127.0.0.1:8000
      src/
        main.tsx
        App.tsx            # the proof page
        capture/
          recorder.ts      # one MediaRecorder per chunk
          silence-cutter.ts
          silence-cutter.test.ts
          level-meter.ts   # AnalyserNode -> dBFS every 50 ms
          wake-lock.ts
          db.ts            # Dexie schema
          upload-queue.ts
          clock.ts         # lecture clock with pause handling
        components/
          LevelMeter.tsx
          TranscriptList.tsx
          DebugPanel.tsx
  packages/
    speech/
      pyproject.toml       # groq, httpx
      src/speech/
        types.py           # Segment, TranscriptionResult
        groq.py            # transcribe(file, mime, language, prompt, model) -> TranscriptionResult
        filters.py         # drop phantom segments
        assemblyai.py      # full-file transcription with speaker labels (eval only for now)
      tests/
        test_filters.py
  evals/
    pyproject.toml         # jiwer, speech
    src/evals/
      transcript.py        # CLI: run providers on a session, score, write results
      wer.py
    corpus/                # gitignored audio; committed: references and vocabulary
      <lecture-slug>/
        reference-10min.txt
        reference-window.json   # {start_ms, end_ms}
        vocabulary.txt
    results/
  .data/                   # gitignored: sessions/<id>/<seq>.<ext>, meta.json, segments.json
```

## Tasks

Each task lists what to build, the details that matter, and the check that closes it. Do them in order; T2 and T4 can swap.

### T1. Scaffold the repo (0.5 day)

Build:

- `git init`, `.gitignore` (Python, Node, `.env`, `.data/`, `evals/corpus/**/*.webm|*.mp4|*.ogg|*.wav`).
- `uv init --name summarise --python ">=3.14"` at the root; members created with `uv init --package` as in Kosh's `uv-workflow` rule. No hand-written dependency lists.
- `apps/web` with `pnpm create vite web --template react-ts`, then `pnpm add dexie` and `pnpm add -D vitest tailwindcss @tailwindcss/vite`.
- `makefile` targets: `setup` (`uv sync --all-packages`, `pnpm --dir apps/web install`, copy `.env.example`), `api`, `web`, `dev` (`$(MAKE) -j2 api web`), `test` (pytest and vitest), `eval-transcript`, `help` (reads `$(firstword $(MAKEFILE_LIST))`, so it works on Linux too).
- `AGENTS.md` pointing to `docs/README.md` and the current stage plan.

Check: `make setup && make test` passes on an empty test suite; `make dev` serves the Vite page on 5173 and `/health` on 8000.

### T2. `packages/speech`: Groq client and filters (1 day)

Build `groq.transcribe(path, mime, *, model, language, prompt) -> TranscriptionResult`:

- Groq `audio.transcriptions.create` with `response_format="verbose_json"`, `timestamp_granularities=["segment"]`, `temperature=0`, `language="en"`.
- `prompt`: course vocabulary joined by commas, then the last 200 characters of the previous chunk's text. Whisper truncates the prompt at 224 tokens, so cap the vocabulary part at 150 tokens (about 600 characters).
- Return each segment's `start`, `end`, `text`, `no_speech_prob`, `avg_logprob`, `compression_ratio`, plus `audio_seconds` and `latency_ms` for the call.
- Retries: 3 attempts on 429 and 5xx, honouring `retry-after`; no retry on 400.

Build `filters.drop_phantoms(segments)`. A segment is dropped when any of these holds:

| Rule | Threshold | Catches |
|---|---|---|
| `no_speech_prob` high and `avg_logprob` low | `> 0.6` and `< -1.0` | Text invented over silence |
| `compression_ratio` | `> 2.4` | Repetition loops |
| Known phantom phrases on a short segment | exact match, lower-cased, under 4 s | "Thank you for watching", "Subtitles by", and the like |

Every dropped segment is kept in the result's `dropped` list with its reason, so the eval can count them and we can tune thresholds with evidence.

Build `assemblyai.transcribe_file(path, speaker_labels=True)` for the eval only: upload, poll, return words with speaker and timestamps.

Check: unit tests for each filter rule using recorded fixtures; one live call (marked `live`, skipped by default) transcribes a 30 s sample file.

### T3. Proof API (0.5 day)

Endpoints under `/api/proof`:

| Endpoint | Body | Returns |
|---|---|---|
| `POST /sessions` | `{label, vocabulary: [str]}` | `{session_id}`; creates `.data/sessions/<id>/meta.json` |
| `POST /sessions/{id}/chunks` | multipart `file`, `seq`, `start_ms`, `duration_ms`, `sha256`, `client_sent_at` | `{seq, segments, dropped_count, server_received_at, groq_latency_ms}` |
| `GET /sessions/{id}/segments` | | all kept segments in `seq` order |
| `GET /health` | | `{status: "ok"}` |

Details:

- Save the file as `.data/sessions/<id>/<seq:05d>.<ext>` before calling Groq, so audio is never lost to a provider error. Re-uploading the same `seq` and `sha256` returns the stored result without a second Groq call.
- Segment times become lecture times: `start_ms = chunk.start_ms + segment.start * 1000`.
- Append one JSON line per chunk to `chunks.jsonl`: sizes, durations, timings, Groq latency, dropped segments. The eval and the lag report read this file.
- Reject files over 8 MB and `duration_ms` over 60,000 with `422`.
- Synchronous endpoints, as decided; FastAPI runs them in its thread pool.

Check: `pytest apps/api` with the speech client faked: upload, idempotent re-upload, oversize rejection, lecture-time conversion.

### T4. Capture module (2 days)

This is the code that matters most; it is written to stage-2 quality.

**`level-meter.ts`.** `AudioContext` + `AnalyserNode` (`fftSize` 2048) on the mic stream. Every 50 ms read `getFloatTimeDomainData`, compute RMS, convert to dBFS (`20 * log10(rms)`, floored at -100). Emits `{t, db}` samples.

**`silence-cutter.ts`.** A pure function, no browser APIs, so it is unit-tested:

```ts
type CutterConfig = {
  minChunkMs: 25_000; maxChunkMs: 45_000;
  silenceWindowMs: 300; floorWindowMs: 30_000;
  floorPercentile: 0.1; marginDb: 6;
};
// returns 'cut' | 'force_cut' | 'continue'
decide(state, sample, config)
```

- Noise floor = 10th percentile of the last 30 s of samples. Silence = sample below floor + 6 dB.
- After 25 s in a chunk, cut at the end of the first run of silence lasting 300 ms. At 45 s, force a cut.
- Track the share of silent samples per chunk; above 95%, the chunk is marked `silent` and not uploaded.

Tests: synthetic sample streams for speech with a pause at 27 s (cuts at the pause), continuous speech (force cut at 45 s), long silence (marked silent), rising room noise (floor follows it).

**`recorder.ts`.** One `MediaRecorder` per chunk on the same stream:

- MIME choice in order: `audio/webm;codecs=opus`, `audio/ogg;codecs=opus`, `audio/mp4`. `audioBitsPerSecond: 32000`.
- On a cut: start the next recorder first, then stop the previous one. The two overlap by a few milliseconds of silence, so there is never a gap.
- `getUserMedia` constraints: `channelCount: 1`, `echoCancellation: false`, `noiseSuppression: true`, `autoGainControl: true`, chosen `deviceId`.
- Pause stops the current recorder (its chunk is kept) and stops cutting; resume starts a new chunk.

**`clock.ts`.** Lecture time = `performance.now()` since start minus total paused time. Each chunk records `startMs` and `durationMs` on this clock, plus wall-clock `endedAt` for lag.

**`db.ts`.** Dexie database `lsa-proof` with the PRD's `chunks` store (`id`, `[sessionId+seq]`, `status`, `blob`, `mime`, `bytes`, `sha256`, `startMs`, `durationMs`, `endedAt`, `attempts`, `lastError`) and a `sessions` store. Call `navigator.storage.persist()` on start and show `navigator.storage.estimate()` in the debug panel.

**`upload-queue.ts`.** One loop: take the lowest `seq` with status `recorded`, upload, store the returned segments, set status `transcribed`. On failure, back off 2, 4, 8 up to 60 s and keep going. Chunks are not deleted in stage 0, so the whole lecture stays in IndexedDB as a backup until you export it.

**`wake-lock.ts`.** Request `screen` lock on start; re-request on `visibilitychange` when visible; release on stop.

Check: vitest passes for the cutter; a 10-minute bench recording produces chunks between 25 and 45 s, none starting mid-word when played back.

### T5. Proof page (0.5 day)

One screen, plain Tailwind, no component library:

- Top: mic picker, level meter bar with the current noise floor marked, Start, Pause, Stop, elapsed time, state chip (`Live`, `Catching up N`, `Offline, recording continues`).
- Middle: transcript rows `mm:ss  text`, newest at the bottom, auto-scroll with a toggle.
- Debug panel (collapsible): per chunk `seq`, duration, cut reason (`silence`/`force`/`silent`/`stop`), bytes, upload ms, Groq ms, lag; running p50 and p95 lag; queue length; storage used.
- `Export session` downloads a JSON report of the debug data, and `Download audio` joins the stored blobs per chunk into a zip, so a lecture can be re-run through the eval even if the server copy is lost.

**Lag definition.** For each chunk: `lag_end = shown_at - endedAt` (processing delay) and `lag_speech = shown_at - chunk start wall time` (worst-case wait for the first word of the chunk). The gate uses `lag_speech` p95.

Check: a 10-minute bench run shows lag figures and an exportable report.

### T6. Transcript eval (1 day)

`make eval-transcript LECTURE=<slug> SESSION=<id>` runs `evals/src/evals/transcript.py`:

1. Read the session's chunks and `chunks.jsonl`.
2. Run each configuration on the same audio:

    | Config | How |
    |---|---|
    | `groq-turbo-chunks` | Already produced live; read from `segments.json` |
    | `groq-v3-chunks` | Re-run every chunk through `whisper-large-v3`, same prompts |
    | `groq-turbo-full` | Join chunks with ffmpeg into one file per 25 MB, transcribe as files; shows what silence cutting costs in accuracy |
    | `assemblyai-full` | Joined file through AssemblyAI with speaker labels |

3. Score each against `reference-10min.txt` inside `reference-window.json`:
    - **WER** with `jiwer`, after lower-casing, removing punctuation and normalising numbers.
    - **Vocabulary recall**: share of `vocabulary.txt` term occurrences in the reference that appear in the hypothesis window.
    - **Phantom rate**: dropped segments plus kept segments that fall inside chunks marked silent, per 100 chunks.
    - **Boundary errors**: words in the reference within 1 s of a cut that are missing or doubled in the hypothesis.
    - **Speaker usefulness** (AssemblyAI only): share of student questions in the reference window labelled with a speaker other than the instructor.
    - **Cost per hour** from `audio_seconds` and the configured rates; **latency** per chunk.
4. Write `evals/results/stage0-<slug>-<date>.json` and print a Markdown table.

Check: the eval runs end to end on the bench recording with a 2-minute reference.

### T7. Field test (1 lecture + 0.5 day)

Run in three steps; do not skip to the real lecture.

1. **Bench (day 3).** Play a 30-minute recorded lecture from a speaker 4 m from the laptop. Expect all gates to pass here; if not, fix before the room test.
2. **Room (day 4).** Record 15 minutes in an empty classroom or large room, speaking from the front. Check levels and cuts.
3. **Real lecture.** Laptop on battery, Chrome, lid open, sitting where you normally sit. During the lecture:
    - At about 30 min: turn Wi-Fi off for 3 minutes, then on. The queue must drain without losing chunks.
    - At about 60 min: switch to another tab for 5 minutes. Recording must continue.
    - Note battery at start and end.
    - Do not reload or close the tab; reload recovery is a stage 2 feature.

After the lecture: export the session, correct a 10-minute excerpt by hand (pick a part with technical terms and at least one student question), write the vocabulary file, run the eval.

Also open the page once in Safari for 5 minutes and record what breaks, without fixing it.

### T8. Decision record (0.5 day)

Write `docs/decisions/0001-speech-provider.md`:

- Context: the five questions.
- Results table from the eval, cost per hour, lag p50 and p95, battery used per hour, Wi-Fi drop and hidden-tab results, Safari notes.
- Decision: provider and model for live chunks; whether speaker labels are worth their cost; tuned filter and cutter thresholds.
- Consequences for stage 1 and 2 (for example a recommended external microphone, or a lower `minChunkMs`).

Then fill this plan's `Outcome` section and update `docs/README.md`.

## Exit gate

All must pass on the real lecture, or be waived in `Outcome` with a reason.

| Gate | Target | Answers |
|---|---|---|
| WER, chosen config, 10-min reference | under 15% (under 25% acceptable with a mic recommendation) | Q1, Q5 |
| Vocabulary recall | over 85% | Q1, Q5 |
| Boundary errors | under 1 per 10 cuts | Q2 |
| Chunks force-cut at 45 s | under 20% | Q2 |
| Phantom rate after filters | under 1 per 100 chunks | Q1 |
| `lag_speech` p95 | under 60 s | Q3 |
| Lost chunks across Wi-Fi drop and hidden tab | 0 | Q4 |
| Recording length | at least 60 min continuous, target 3 h | Q4 |
| Battery used | under 25% per hour on your laptop | Q4 |
| Cost per hour, chosen config | measured and written down | Q5 |
| Recording permission | confirmed for the pilot course | legal |

## Risks inside this stage

| Risk | Sign | Response |
|---|---|---|
| Room noise floor too high for silence cuts | Most chunks force-cut | Lower `marginDb` to 3, or cut on the quietest 300 ms between 25 and 45 s instead of the first |
| Chrome throttles the hidden tab and cutting stops | Chunks over 45 s after the tab test | Move level sampling into an `AudioWorklet`, which is not throttled |
| Whisper misses course terms | Recall under 85% | Check the prompt length; try `whisper-large-v3`; add terms from slides |
| Groq developer-tier limits | 429s in `chunks.jsonl` | Upgrade tier; the retries already cover short bursts |
| Laptop mic too weak | WER over 25% | Repeat with a USB or clip-on mic; record the recommendation |

## Decisions

Resolved 2026-10-18: option (a) for all four.

- [x] **Code fate.** (a) Keep `capture/`, `packages/speech` and `evals` and build stages 1 and 2 on them; delete only `modules/proof`. **Recommended.** (b) Throw the whole stage away.
- [x] **Python version.** (a) 3.14, same as Kosh. **Recommended.** (b) 3.13, as the PRD's repo tree says.
- [x] **Lecture length for the gate.** (a) 60 minutes minimum, 3 h if available. **Recommended.** (b) 3 h required.
- [x] **AssemblyAI in the comparison.** (a) Include, to decide on speaker labels with evidence. **Recommended.** (b) Skip; Groq only.

## Outcome

_Filled in when the stage closes: what shipped, gate results, deviations from this plan, notes for stage 1._

### Deviations so far

- **T2 phantom filters (2026-10-18).** Groq returns `no_speech_prob = 0` on every segment, so the planned `no_speech_prob > 0.6` rule never fires. Probed with 30 s of silence, faint noise and hum: without a prompt Whisper emits stock phrases ("Thank you.", "So, let's go."); with a prompt it echoes the prompt ("and the F1 score is the harmonic."), sometimes at normal confidence (`avg_logprob` -0.86). Rules now: `avg_logprob < -1.0`, prompt echo (3+ words, 80%+ found in the prompt), whole-segment stock phrase at any length, `compression_ratio > 2.4`; `no_speech_prob` kept for other providers. The browser's silent-chunk skip (T4) stays the first line of defence.
- **T4 level meter (2026-10-18).** Built on an `AudioWorklet` from the start instead of a 50 ms timer, since background tabs throttle timers but not the audio thread. This was the planned fallback; doing it first removes the hidden-tab risk.
- **T4 silence cutter (2026-10-18).** Three rules added beyond floor + 6 dB, each driven by a failing case: (1) silence must also be 10 dB under the speech level (90th percentile), or nonstop speech reads as silence and is cut mid-word at 25 s; (2) the speech level is a peak decaying 1 dB per 30 s, so a long break still reads as silence; (3) the threshold never sinks more than 35 dB under speech, found in the browser when exact-zero gaps set it to -94 dB and every cut became a forced, word-splitting cut. Consequence: before any speech is heard, nothing is marked silent and those chunks are uploaded for the server filters.
- **T4 browser check (2026-10-18).** Real speech (the 18 s sample, played twice) through a Web Audio stream in Chrome with 5–9 s test limits: 5 of 6 speech chunks cut in silence at sentence ends, no split words after the fix, trailing silence chunks not uploaded, lag from chunk end to text 0.26–0.7 s (Groq 0.29–0.67 s).
- **T5 page (2026-10-18).** Added a dev-only "Audio file" source that plays a file into the pipeline, for repeatable runs without a microphone. Checked in Chrome with a 75 s spoken lecture (macOS `say`, natural pauses) at the real 25–45 s limits: 3 silence cuts (28.2, 29.5, 25.0 s), 0 forced, lag from chunk start p95 30.2 s, from chunk end p95 0.8 s, trailing silence not uploaded, transcript accurate apart from "Thus two" for "These two" and "recall I" for "recall is". Not yet checked: a real microphone, a hidden tab, Wi-Fi loss, Safari.
