import json
from pathlib import Path

import pytest

from evals.corpus import load_lecture, load_session
from evals.reference import draft, parse_clock


def test_parse_clock() -> None:
    assert parse_clock("12:30") == 750_000
    assert parse_clock("1:02:03") == 3_723_000


def test_draft_snaps_window_to_segments_and_loads_back(data_dir: Path, tmp_path: Path) -> None:
    corpus = tmp_path / "corpus"
    folder = draft("lec", load_session("s1", data_dir), 10_000, 60_000, corpus)

    window = json.loads((folder / "reference-window.json").read_text())
    assert window == {"session": "s1", "start_ms": 14_000, "end_ms": 57_000}
    assert (folder / "vocabulary.txt").read_text() == "precision\nF1 score\n"

    lecture = load_lecture("lec", corpus)
    assert lecture.reference == "and recall the F1 score is the harmonic mean"


def test_draft_never_overwrites_a_corrected_reference(data_dir: Path, tmp_path: Path) -> None:
    corpus = tmp_path / "corpus"
    session = load_session("s1", data_dir)
    draft("lec", session, 0, 60_000, corpus)
    with pytest.raises(FileExistsError):
        draft("lec", session, 0, 60_000, corpus)
    draft("lec", session, 0, 60_000, corpus, force=True)


def test_draft_rejects_empty_window(data_dir: Path, tmp_path: Path) -> None:
    with pytest.raises(ValueError):
        draft("lec", load_session("s1", data_dir), 200_000, 300_000, tmp_path)
