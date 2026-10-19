import json
from pathlib import Path

import pytest


def chunk_result(seq: int, start_ms: int, duration_ms: int, segments: list[tuple]) -> dict:
    return {
        "seq": seq,
        "start_ms": start_ms,
        "duration_ms": duration_ms,
        "bytes": 10,
        "sha256": "x",
        "mime": "audio/webm;codecs=opus",
        "segments": [
            {"seq": seq, "start_ms": a, "end_ms": b, "text": text} for a, b, text in segments
        ],
        "dropped": [{"start_ms": 0, "end_ms": 1, "text": "Thank you.", "reason": "stock_phrase"}]
        if seq == 2
        else [],
        "model": "whisper-large-v3-turbo",
        "audio_seconds": duration_ms / 1000,
        "groq_latency_ms": 300 + seq,
        "client_sent_at": None,
        "server_received_at": 1.0,
        "server_done_at": 2.0,
    }


@pytest.fixture
def data_dir(tmp_path: Path) -> Path:
    """A recorded session with three chunks; chunk 3 starts after a silent gap."""
    folder = tmp_path / "data" / "sessions" / "s1"
    folder.mkdir(parents=True)
    (folder / "meta.json").write_text(
        json.dumps({"id": "s1", "label": "test", "vocabulary": ["precision", "F1 score"]})
    )
    chunks = [
        chunk_result(
            1, 0, 30_000, [(0, 14_000, "today we cover precision"), (14_000, 29_000, "and recall")]
        ),
        chunk_result(2, 30_000, 28_000, [(30_500, 57_000, "the F1 score is the harmonic mean")]),
        chunk_result(3, 70_000, 25_000, [(70_000, 94_000, "for homework read chapter four")]),
    ]
    for c in chunks:
        (folder / f"{c['seq']:05d}.json").write_text(json.dumps(c))
        (folder / f"{c['seq']:05d}.webm").write_bytes(b"audio")
    return tmp_path / "data"


@pytest.fixture
def corpus_dir(tmp_path: Path) -> Path:
    folder = tmp_path / "corpus" / "demo"
    folder.mkdir(parents=True)
    (folder / "reference-window.json").write_text(
        json.dumps({"session": "s1", "start_ms": 0, "end_ms": 60_000})
    )
    (folder / "reference-10min.txt").write_text(
        "# corrected by hand\n"
        "Today we cover precision and recall.\n"
        "Student: Is the F1 score on the exam?\n"
        "Instructor: The F1 score is the harmonic mean.\n"
    )
    (folder / "vocabulary.txt").write_text("precision\nrecall\nF1 score\n")
    return tmp_path / "corpus"
