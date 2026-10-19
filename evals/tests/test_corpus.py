from pathlib import Path

from evals.corpus import Segment, in_window, load_lecture, load_session


def test_load_session_reads_chunks_in_order(data_dir: Path) -> None:
    session = load_session("s1", data_dir)
    assert [c.seq for c in session.chunks] == [1, 2, 3]
    assert session.chunks[2].start_ms == 70_000
    assert session.chunks[0].path.name == "00001.webm"
    assert session.vocabulary == ["precision", "F1 score"]
    assert session.duration_ms == 95_000


def test_load_lecture_strips_speaker_prefixes_and_comments(corpus_dir: Path) -> None:
    lecture = load_lecture("demo", corpus_dir)
    assert lecture.reference == (
        "Today we cover precision and recall. Is the F1 score on the exam? "
        "The F1 score is the harmonic mean."
    )
    assert lecture.student_turns == ["Is the F1 score on the exam?"]
    assert (lecture.session_id, lecture.start_ms, lecture.end_ms) == ("s1", 0, 60_000)
    assert lecture.vocabulary == ["precision", "recall", "F1 score"]


def test_in_window_uses_segment_midpoints() -> None:
    segments = [
        Segment(1, 0, 10_000, "a"),  # midpoint 5 s
        Segment(1, 55_000, 70_000, "b"),  # midpoint 62.5 s: outside
        Segment(2, 50_000, 60_000, "c"),  # midpoint 55 s
    ]
    assert [s.text for s in in_window(segments, 0, 60_000)] == ["a", "c"]
