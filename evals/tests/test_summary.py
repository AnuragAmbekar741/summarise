import pytest

from evals.summary import markdown, pool


def score(config: str, **overrides) -> dict:
    base = {
        "config": config,
        "wer": 0.1,
        "substitutions": 5,
        "deletions": 3,
        "insertions": 2,
        "reference_words": 100,
        "term_occurrences": 4,
        "terms_found": 3,
        "cuts_in_window": None,
        "boundary_errors": None,
        "baseline_error_rate": None,
        "student_turns_labelled": None,
        "student_turns_in_window": 0,
        "dropped_per_100_chunks": None,
        "latency_p50_ms": 500,
        "cost_per_lecture_hour": 0.04,
    }
    return base | overrides


def test_pool_weights_by_words_terms_and_cuts() -> None:
    results = {
        "a": {"scores": [
            score("groq-turbo-chunks", reference_words=100, cuts_in_window=10, boundary_errors=5,
                  baseline_error_rate=0.3),
            score("groq-turbo-full", substitutions=4),
        ]},
        "b": {"scores": [
            score("groq-turbo-chunks", reference_words=300, substitutions=20, cuts_in_window=30,
                  boundary_errors=9, baseline_error_rate=0.3, terms_found=4),
            score("groq-turbo-full", reference_words=300, substitutions=15),
        ]},
    }  # fmt: skip
    pooled = pool(results)
    chunks = pooled["groq-turbo-chunks"]
    # Errors (5+3+2) + (20+3+2) = 35 over 400 words.
    assert chunks["wer"] == pytest.approx(35 / 400, abs=1e-4)
    assert chunks["term_recall"] == pytest.approx(7 / 8)
    # Near-cut rate 14/40 = 0.35 against baseline 0.3: 0.5 extra errors per 10 cuts.
    assert chunks["cut_excess_per_10_cuts"] == pytest.approx(0.5)
    assert pooled["groq-turbo-full"]["cut_excess_per_10_cuts"] is None

    text = markdown(pooled, None, results)
    assert "Chunking penalty" in text
    assert "| a |" in text and "| b |" in text


def test_pool_student_turns() -> None:
    results = {
        "a": {
            "scores": [
                score("assemblyai-full", student_turns_labelled=0.5, student_turns_in_window=4)
            ]
        },
        "b": {
            "scores": [
                score("assemblyai-full", student_turns_labelled=1.0, student_turns_in_window=2)
            ]
        },
    }
    assert pool(results)["assemblyai-full"]["student_turns_labelled"] == pytest.approx(
        4 / 6, abs=1e-4
    )
