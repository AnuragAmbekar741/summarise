"""Compare transcription configurations on one recorded lecture.

    make eval-transcript LECTURE=cs229-w3

Runs each configuration on the lecture's session (cached under
evals/results/cache/<session>/ so a rerun costs nothing; --fresh to redo),
scores it against the corrected reference window, writes
evals/results/stage0-<lecture>-<date>.json and prints a table.
"""

import argparse
import json
from datetime import UTC, datetime
from pathlib import Path

from evals.audio import FfmpegMissing, lecture_parts
from evals.corpus import RESULTS_DIR, Session, load_lecture, load_session
from evals.keys import MissingKey, key
from evals.normalize import normalize
from evals.providers import (
    ASSEMBLYAI_FULL,
    CONFIGS,
    GROQ_TURBO_CHUNKS,
    GROQ_TURBO_FULL,
    GROQ_V3_CHUNKS,
    Hypothesis,
    full_file_assemblyai,
    full_file_groq,
    live_chunks,
    rerun_chunks,
)
from evals.score import Score, align_span, gate_notes, score, window_words
from speech import assemblyai, groq

RATES_NOTE = "USD rates are the October 2026 research snapshot; confirm before deciding."


def run(config: str, session: Session, cache: Path, fresh: bool) -> Hypothesis:
    if config == GROQ_TURBO_CHUNKS:
        return live_chunks(session)
    path = cache / f"{config}.json"
    if path.exists() and not fresh:
        return Hypothesis.from_json(json.loads(path.read_text()))

    if config == GROQ_V3_CHUNKS:
        client = groq.make_client(key("GROQ_API_KEY"))
        hypothesis = rerun_chunks(
            session,
            lambda p, prompt: groq.transcribe(p, client=client, model=groq.LARGE_V3, prompt=prompt),
            GROQ_V3_CHUNKS,
        )
    elif config == GROQ_TURBO_FULL:
        client = groq.make_client(key("GROQ_API_KEY"))
        parts = lecture_parts(session.chunks, cache / "audio-parts")
        hypothesis = full_file_groq(
            parts,
            lambda p, prompt: groq.transcribe(p, client=client, model=groq.TURBO, prompt=prompt),
            session.vocabulary,
        )
    elif config == ASSEMBLYAI_FULL:
        api_key = key("ASSEMBLYAI_API_KEY")
        [(full, offset_ms)] = lecture_parts(
            session.chunks, cache / "audio-full", part_seconds=10**7
        )
        with assemblyai.make_client(api_key) as client:
            hypothesis = full_file_assemblyai(
                full, offset_ms, lambda p: assemblyai.transcribe_file(p, client=client)
            )
    else:
        raise ValueError(f"unknown config {config}")

    cache.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(hypothesis.to_json(), indent=1))
    return hypothesis


def table(scores: list[Score]) -> str:
    def pct(v: float | None) -> str:
        return "–" if v is None else f"{v:.1%}"

    def num(v: float | None, unit: str = "") -> str:
        return "–" if v is None else f"{v}{unit}"

    rows = [
        (
            "| Config | WER | sub/del/ins | Terms found | Cut errors over baseline per 10 | Dropped"
            " per 100 chunks | Student turns labelled | Latency p50 / p95 | $ per lecture hour | Gates |"
        ),
        "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
    ]
    for s in scores:
        cost = "–" if s.cost_per_lecture_hour is None else f"{s.cost_per_lecture_hour:.3f}"
        latency = (
            "–"
            if s.latency_p50_ms is None
            else f"{s.latency_p50_ms / 1000:.1f} / {(s.latency_p95_ms or 0) / 1000:.1f} s"
        )
        rows.append(
            f"| {s.config} | {pct(s.wer)} | {s.substitutions}/{s.deletions}/{s.insertions}"
            f" | {s.terms_found}/{s.term_occurrences} | {num(s.boundary_excess_per_10_cuts)}"
            f" | {num(s.dropped_per_100_chunks)} | {pct(s.student_turns_labelled)}"
            f" | {latency} | {cost} | {'; '.join(gate_notes(s)) or 'pass'} |"
        )
    return "\n".join(rows)


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--lecture", required=True)
    parser.add_argument("--session", help="defaults to the session in reference-window.json")
    parser.add_argument("--configs", default=",".join(CONFIGS))
    parser.add_argument("--fresh", action="store_true", help="ignore cached provider results")
    args = parser.parse_args(argv)

    lecture = load_lecture(args.lecture)
    session = load_session(args.session or lecture.session_id)
    cache = RESULTS_DIR / "cache" / session.id

    # One reference slice for every config: aligned to what ran live.
    live_words, _, _ = window_words(lecture, run(GROQ_TURBO_CHUNKS, session, cache, False))
    span = align_span(normalize(lecture.reference), live_words)

    scores: list[Score] = []
    dropped: dict[str, list[dict]] = {}
    skipped: dict[str, str] = {}
    for config in args.configs.split(","):
        print(f"running {config} ...", flush=True)
        try:
            hypothesis = run(config, session, cache, args.fresh)
            scores.append(score(lecture, session, hypothesis, span))
            dropped[config] = hypothesis.dropped_segments
        except (FfmpegMissing, MissingKey) as error:
            skipped[config] = str(error)
            print(f"  skipped: {error}")

    date = datetime.now(UTC).strftime("%Y-%m-%d")
    out = RESULTS_DIR / f"stage0-{lecture.slug}-{date}.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(
        json.dumps(
            {
                "lecture": lecture.slug,
                "session": session.id,
                "window_ms": [lecture.start_ms, lecture.end_ms],
                "reference_span": list(span),
                "lecture_ms": session.duration_ms,
                "generated_at": datetime.now(UTC).isoformat(timespec="seconds"),
                "rates_note": RATES_NOTE,
                "scores": [s.to_json() for s in scores],
                "dropped_segments": dropped,
                "skipped": skipped,
            },
            indent=2,
        )
        + "\n"
    )
    print()
    print(table(scores))
    print(f"\n{RATES_NOTE}\nWrote {out}")


if __name__ == "__main__":
    main()
