"""Pool the latest transcript results of every corpus lecture into one comparison.

    make eval-summary

Reads evals/results/stage0-<slug>-<date>.json (latest per lecture) and each
lecture's simulation.json, and writes evals/results/stage0-summary.json and .md.
WER, term recall, cut errors and student turns are pooled over words, terms,
cuts and turns, so long lectures weigh more than short ones.
"""

import json
from collections import defaultdict
from datetime import UTC, datetime
from pathlib import Path
from statistics import median

from evals.corpus import CORPUS_DIR, RESULTS_DIR
from evals.fetch import manifest
from evals.providers import CONFIGS, GROQ_TURBO_CHUNKS, GROQ_TURBO_FULL


def latest_results(results_dir: Path, slugs: list[str]) -> dict[str, dict]:
    found = {}
    for slug in slugs:
        files = sorted(results_dir.glob(f"stage0-{slug}-*.json"))
        if files:
            found[slug] = json.loads(files[-1].read_text())
    return found


def pool(results: dict[str, dict]) -> dict[str, dict]:
    by_config: dict[str, list[dict]] = defaultdict(list)
    for result in results.values():
        for s in result["scores"]:
            by_config[s["config"]].append(s)

    pooled = {}
    for config in CONFIGS:
        scores = by_config.get(config)
        if not scores:
            continue
        words = sum(s["reference_words"] for s in scores)
        errors = sum(s["substitutions"] + s["deletions"] + s["insertions"] for s in scores)
        occurrences = sum(s["term_occurrences"] for s in scores)
        found = sum(s["terms_found"] for s in scores)
        cut_scores = [s for s in scores if s.get("cuts_in_window")]
        cuts = sum(s["cuts_in_window"] for s in cut_scores)
        excess = None
        if cuts and all(s["baseline_error_rate"] is not None for s in cut_scores):
            near = sum(s["boundary_errors"] for s in cut_scores) / cuts
            base = sum(s["baseline_error_rate"] * s["cuts_in_window"] for s in cut_scores) / cuts
            excess = round(10 * (near - base), 2)
        turns = sum(
            s["student_turns_in_window"] for s in scores if s["student_turns_labelled"] is not None
        )
        labelled = sum(
            round(s["student_turns_labelled"] * s["student_turns_in_window"])
            for s in scores
            if s["student_turns_labelled"] is not None
        )
        dropped = [
            s["dropped_per_100_chunks"] for s in scores if s["dropped_per_100_chunks"] is not None
        ]
        latencies = [s["latency_p50_ms"] for s in scores if s["latency_p50_ms"] is not None]
        costs = [
            s["cost_per_lecture_hour"] for s in scores if s["cost_per_lecture_hour"] is not None
        ]
        pooled[config] = {
            "lectures": len(scores),
            "reference_words": words,
            "wer": round(errors / words, 4),
            "wer_min": min(s["wer"] for s in scores),
            "wer_median": median(s["wer"] for s in scores),
            "wer_max": max(s["wer"] for s in scores),
            "term_recall": round(found / occurrences, 4) if occurrences else None,
            "term_occurrences": occurrences,
            "cuts": cuts or None,
            "cut_excess_per_10_cuts": excess,
            "student_turns_labelled": round(labelled / turns, 4) if turns else None,
            "student_turns": turns or None,
            "dropped_per_100_chunks": round(sum(dropped) / len(dropped), 1) if dropped else None,
            "latency_p50_ms": round(median(latencies)) if latencies else None,
            "cost_per_lecture_hour": round(sum(costs) / len(costs), 4) if costs else None,
        }
    return pooled


def cut_summary(corpus_dir: Path, slugs: list[str]) -> dict | None:
    reports = [
        json.loads(p.read_text())
        for slug in slugs
        if (p := corpus_dir / slug / "simulation.json").exists()
    ]
    if not reports:
        return None
    chunks = [c for r in reports for c in r["chunks"]]
    in_speech = [c for c in chunks if c["reason"] in ("silence", "force")]
    lengths = sorted((c["end_ms"] - c["start_ms"]) / 1000 for c in chunks if not c["silent"])
    return {
        "lectures": len(reports),
        "hours": round(sum(r["duration_ms"] for r in reports) / 3_600_000, 2),
        "chunks": len(chunks),
        "silent": sum(c["silent"] for c in chunks),
        "force_cut_share": round(
            sum(c["reason"] == "force" for c in in_speech) / len(in_speech), 4
        ),
        "chunk_seconds_p50": lengths[len(lengths) // 2],
        "chunk_seconds_p95": lengths[int(len(lengths) * 0.95)],
    }


def markdown(pooled: dict[str, dict], cuts: dict | None, results: dict[str, dict]) -> str:
    def pct(v: float | None) -> str:
        return "–" if v is None else f"{v:.1%}"

    lines = [
        f"# Stage 0 transcript evaluation, {len(results)} lectures",
        "",
        (
            "| Config | WER pooled | WER median (min–max) | Term recall | Cut errors over baseline"
            " per 10 cuts | Student turns labelled | Dropped per 100 chunks | Latency p50 | $ per"
            " lecture hour |"
        ),
        "| --- | --- | --- | --- | --- | --- | --- | --- | --- |",
    ]
    for config, p in pooled.items():
        latency = "–" if p["latency_p50_ms"] is None else f"{p['latency_p50_ms'] / 1000:.1f} s"
        cost = "–" if p["cost_per_lecture_hour"] is None else f"{p['cost_per_lecture_hour']:.3f}"
        lines.append(
            f"| {config} | {pct(p['wer'])} | {pct(p['wer_median'])} ({pct(p['wer_min'])}–"
            f"{pct(p['wer_max'])}) | {pct(p['term_recall'])} ({p['term_occurrences']}) |"
            f" {'–' if p['cut_excess_per_10_cuts'] is None else p['cut_excess_per_10_cuts']} |"
            f" {pct(p['student_turns_labelled'])} | {p['dropped_per_100_chunks'] or '–'} |"
            f" {latency} | {cost} |"
        )
    if GROQ_TURBO_CHUNKS in pooled and GROQ_TURBO_FULL in pooled:
        penalty = pooled[GROQ_TURBO_CHUNKS]["wer"] - pooled[GROQ_TURBO_FULL]["wer"]
        lines += [
            "",
            f"Chunking penalty (Turbo chunks minus Turbo whole window): {penalty:+.1%} WER.",
        ]
    if cuts:
        lines += [
            "",
            (
                f"Cuts over {cuts['hours']} h of full lectures: {cuts['chunks']} chunks,"
                f" {cuts['force_cut_share']:.1%} forced, {cuts['silent']} silent, chunk length"
                f" p50 {cuts['chunk_seconds_p50']:.1f} s, p95 {cuts['chunk_seconds_p95']:.1f} s."
            ),
        ]
    lines += ["", "| Lecture | " + " | ".join(pooled) + " |", "| --- |" + " --- |" * len(pooled)]
    for slug, result in results.items():
        wers = {s["config"]: pct(s["wer"]) for s in result["scores"]}
        lines.append(f"| {slug} | " + " | ".join(wers.get(c, "–") for c in pooled) + " |")
    return "\n".join(lines) + "\n"


def main() -> None:
    slugs = [l["slug"] for l in manifest()["lectures"]]
    results = latest_results(RESULTS_DIR, slugs)
    pooled = pool(results)
    cuts = cut_summary(CORPUS_DIR, slugs)
    report = {
        "generated_at": datetime.now(UTC).isoformat(timespec="seconds"),
        "lectures": list(results),
        "configs": pooled,
        "cuts": cuts,
    }
    (RESULTS_DIR / "stage0-summary.json").write_text(json.dumps(report, indent=2) + "\n")
    text = markdown(pooled, cuts, results)
    (RESULTS_DIR / "stage0-summary.md").write_text(text)
    print(text)


if __name__ == "__main__":
    main()
