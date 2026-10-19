from pathlib import Path

import pytest

from evals.corpus import Segment, load_lecture, load_session
from evals.metrics import percentile
from evals.normalize import normalize
from evals.providers import ASSEMBLYAI_FULL, Hypothesis, live_chunks
from evals.score import (
    align_span,
    gate_notes,
    score,
    student_turns_in_span,
    student_turns_labelled,
)


def test_percentile_matches_web_app() -> None:
    values = list(range(1, 21))
    assert percentile(values, 0.5) == 10
    assert percentile(values, 0.95) == 19
    assert percentile([], 0.5) is None


def test_score_live_chunks(data_dir: Path, corpus_dir: Path) -> None:
    lecture = load_lecture("demo", corpus_dir)
    session = load_session("s1", data_dir)

    s = score(lecture, session, live_chunks(session))

    # Window 0–60 s holds chunks 1 and 2: "today we cover precision and recall
    # the F1 score is the harmonic mean"; the reference also has the student question.
    assert s.reference_words == 20
    assert s.deletions == 7  # "is the f1 score on the exam" missing
    assert s.cuts_in_window == 1
    assert s.boundary_errors == 1  # the missing question sits right at the cut
    assert s.term_recall == pytest.approx(3 / 4)  # one F1 score occurrence missing
    assert (s.terms_found, s.term_occurrences) == (3, 4)
    assert s.missed_terms == ["f1 score"]
    assert s.dropped_per_100_chunks == pytest.approx(33.3)
    assert s.latency_p50_ms == 302
    assert s.cost_per_lecture_hour == pytest.approx(0.04 * 83 / 95, abs=1e-4)
    assert s.student_turns_labelled is None


def test_student_turns_labelled_uses_minority_speaker(corpus_dir: Path) -> None:
    lecture = load_lecture("demo", corpus_dir)
    segments = [
        Segment(1, 0, 10_000, "Today we cover precision and recall", "A"),
        Segment(1, 10_000, 14_000, "Is the F1 score on the exam", "B"),
        Segment(1, 14_000, 30_000, "The F1 score is the harmonic mean of both", "A"),
    ]
    turns = lecture.student_turns
    assert student_turns_labelled(turns, segments, segments) == 1.0

    same_speaker = [Segment(s.seq, s.start_ms, s.end_ms, s.text, "A") for s in segments]
    assert student_turns_labelled(turns, same_speaker, same_speaker) == 0.0


def test_full_file_scores_have_no_cut_metrics(data_dir: Path, corpus_dir: Path) -> None:
    lecture = load_lecture("demo", corpus_dir)
    hypothesis = Hypothesis(
        config=ASSEMBLYAI_FULL,
        segments=[Segment(1, 0, 20_000, lecture.reference, "A")],
        audio_seconds=95,
        billed_seconds=95,
        requests=1,
        latencies_ms=[5_000],
        dropped=0,
    )
    s = score(lecture, load_session("s1", data_dir), hypothesis)
    assert s.wer == 0
    assert s.boundary_errors is None and s.cuts_in_window is None
    assert gate_notes(s) == []


def test_gate_notes_flag_failures(data_dir: Path, corpus_dir: Path) -> None:
    session = load_session("s1", data_dir)
    s = score(load_lecture("demo", corpus_dir), session, live_chunks(session))
    notes = gate_notes(s)
    assert any("WER" in n for n in notes)
    assert any("term recall" in n for n in notes)
    # One cut with an error next to it, but the window is too short for a baseline,
    # so no claim is made about cuts causing errors.
    assert s.boundary_error_rate == 1.0
    assert s.baseline_error_rate is None
    assert not any("cuts add" in n for n in notes)


def test_align_span_finds_the_window_inside_a_full_transcript() -> None:
    reference = normalize(
        "welcome everyone to the course. today we cover precision and recall in detail, "
        "and then the f1 score. next week regularization and more."
    )
    hypothesis = normalize("we cover precision and recall in detail and then the f1 score")
    start, end = align_span(reference, hypothesis)
    assert reference[start:end] == hypothesis


def test_align_span_extends_past_misheard_edges() -> None:
    reference = normalize("one two three four five six seven eight nine ten eleven twelve")
    hypothesis = normalize("tree four five six seven eight nine tin")  # edges misheard
    start, end = align_span(reference, hypothesis)
    assert reference[start:end] == normalize("three four five six seven eight nine ten")


def test_student_turns_in_span(corpus_dir: Path) -> None:
    lecture = load_lecture("demo", corpus_dir)
    # Turn token ranges: 0-6 instructor, 6-13 student, 13-20 instructor.
    assert student_turns_in_span(lecture, (0, 6)) == []
    assert student_turns_in_span(lecture, (5, 8)) == ["Is the F1 score on the exam?"]


def test_score_slices_a_full_reference(data_dir: Path, corpus_dir: Path) -> None:
    lecture = load_lecture("demo", corpus_dir)
    lecture.reference = (
        "Opening remarks before the window. " + lecture.reference + " Closing words."
    )
    lecture.turns = [
        ("", "Opening remarks before the window."),
        *lecture.turns,
        ("", "Closing words."),
    ]
    session = load_session("s1", data_dir)

    s = score(lecture, session, live_chunks(session))

    assert s.reference_words < len(normalize(lecture.reference))
    assert s.reference_span[0] == 5  # "opening remarks before the window" skipped
