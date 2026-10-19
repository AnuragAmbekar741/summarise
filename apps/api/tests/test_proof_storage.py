from pathlib import Path

import pytest

from api.modules.proof.schemas import ChunkResult, SegmentOut
from api.modules.proof.storage import SessionNotFound, SessionStore, extension_for


def result(seq: int, text: str = "hello") -> ChunkResult:
    return ChunkResult(
        seq=seq,
        start_ms=seq * 30_000,
        duration_ms=30_000,
        bytes=10,
        sha256="abc",
        mime="audio/webm",
        segments=[SegmentOut(seq=seq, start_ms=seq * 30_000, end_ms=seq * 30_000 + 900, text=text)],
        dropped=[],
        model="whisper-large-v3-turbo",
        audio_seconds=30.0,
        groq_latency_ms=400,
        client_sent_at=None,
        server_received_at=1.0,
        server_done_at=2.0,
    )


def test_create_writes_meta(tmp_path: Path) -> None:
    store = SessionStore(tmp_path)
    session_id = store.create("CS 229 week 3", ["precision", "recall"])
    meta = store.meta(session_id)
    assert meta["label"] == "CS 229 week 3"
    assert meta["vocabulary"] == ["precision", "recall"]
    assert (tmp_path / "sessions" / session_id / "meta.json").exists()


def test_results_round_trip_in_seq_order(tmp_path: Path) -> None:
    store = SessionStore(tmp_path)
    session_id = store.create("", [])
    store.save_audio(session_id, 2, "webm", b"two")
    store.save_result(session_id, result(2, "second"))
    store.save_result(session_id, result(1, "first"))

    assert store.result(session_id, 3) is None
    assert store.result(session_id, 2) == result(2, "second")
    assert [r.seq for r in store.results(session_id)] == [1, 2]
    log = (tmp_path / "sessions" / session_id / "chunks.jsonl").read_text().splitlines()
    assert len(log) == 2  # arrival order: 2 then 1
    assert (tmp_path / "sessions" / session_id / "00002.webm").read_bytes() == b"two"


def test_latest_result_before(tmp_path: Path) -> None:
    store = SessionStore(tmp_path)
    session_id = store.create("", [])
    for seq in (1, 2, 5):
        store.save_result(session_id, result(seq, f"chunk {seq}"))
    assert store.latest_result_before(session_id, 1) is None
    assert store.latest_result_before(session_id, 4).segments[0].text == "chunk 2"
    assert store.latest_result_before(session_id, 9).segments[0].text == "chunk 5"


@pytest.mark.parametrize("bad", ["../../etc", "nope", "00000000-0000-0000-0000-000000000000"])
def test_unknown_or_unsafe_session_ids_are_not_found(tmp_path: Path, bad: str) -> None:
    store = SessionStore(tmp_path)
    with pytest.raises(SessionNotFound):
        store.meta(bad)


@pytest.mark.parametrize(
    ("mime", "ext"),
    [
        ("audio/webm;codecs=opus", "webm"),
        ("audio/ogg; codecs=opus", "ogg"),
        ("audio/mp4", "m4a"),
        ("video/webm", None),
    ],
)
def test_extension_for(mime: str, ext: str | None) -> None:
    assert extension_for(mime) == ext
