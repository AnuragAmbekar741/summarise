import hashlib
from pathlib import Path

import pytest

from api.modules.proof.service import (
    ChunkConflict,
    ChunkRejected,
    ChunkUpload,
    TranscriptionFailed,
    transcribe_chunk,
)
from api.modules.proof.storage import SessionStore
from speech.types import Segment, TranscriptionResult


class FakeTranscriber:
    def __init__(self, *segments: Segment) -> None:
        self.segments = list(segments)
        self.calls: list[tuple[Path, str, str]] = []

    def __call__(self, path: Path, mime: str, prompt: str) -> TranscriptionResult:
        self.calls.append((path, mime, prompt))
        return TranscriptionResult(
            model="whisper-large-v3-turbo",
            segments=self.segments,
            audio_seconds=30.0,
            latency_ms=350,
        )


def upload(seq: int = 1, data: bytes = b"audio", **overrides) -> ChunkUpload:
    fields = {
        "seq": seq,
        "start_ms": 60_000,
        "duration_ms": 30_000,
        "sha256": hashlib.sha256(data).hexdigest(),
        "mime": "audio/webm;codecs=opus",
        "data": data,
    }
    return ChunkUpload(**(fields | overrides))


@pytest.fixture
def store(tmp_path: Path) -> SessionStore:
    return SessionStore(tmp_path)


def test_converts_to_lecture_time_and_filters(store: SessionStore) -> None:
    session_id = store.create("", ["precision"])
    fake = FakeTranscriber(
        Segment(start=1.5, end=4.25, text="Precision matters.", avg_logprob=-0.2),
        Segment(start=5.0, end=30.0, text="Thank you.", avg_logprob=-0.3),
    )

    result = transcribe_chunk(store, fake, session_id, upload())

    assert [(s.start_ms, s.end_ms, s.text) for s in result.segments] == [
        (61_500, 64_250, "Precision matters.")
    ]
    assert [(d.reason, d.start_ms) for d in result.dropped] == [("stock_phrase", 65_000)]
    path, mime, prompt = fake.calls[0]
    assert path.name == "00001.webm" and path.read_bytes() == b"audio"
    assert mime == "audio/webm;codecs=opus"
    assert prompt == "precision."


def test_prompt_uses_latest_earlier_chunk(store: SessionStore) -> None:
    session_id = store.create("", [])
    transcribe_chunk(store, FakeTranscriber(Segment(0, 2, "first part")), session_id, upload(1))
    later = FakeTranscriber(Segment(0, 2, "later part"))

    transcribe_chunk(store, later, session_id, upload(4, b"four"))  # 2 and 3 were silent

    assert later.calls[0][2] == "first part"


def test_long_chunk_from_a_stalled_cutter_is_still_transcribed(store: SessionStore) -> None:
    session_id = store.create("", [])
    result = transcribe_chunk(
        store, FakeTranscriber(Segment(0, 1, "ok")), session_id, upload(duration_ms=90_000)
    )
    assert [s.text for s in result.segments] == ["ok"]


def test_same_upload_returns_stored_result_without_transcribing(store: SessionStore) -> None:
    session_id = store.create("", [])
    fake = FakeTranscriber(Segment(0, 2, "hello"))
    first = transcribe_chunk(store, fake, session_id, upload())
    again = transcribe_chunk(store, fake, session_id, upload())
    assert again == first
    assert len(fake.calls) == 1


def test_same_seq_with_other_audio_conflicts(store: SessionStore) -> None:
    session_id = store.create("", [])
    transcribe_chunk(store, FakeTranscriber(), session_id, upload())
    with pytest.raises(ChunkConflict):
        transcribe_chunk(store, FakeTranscriber(), session_id, upload(data=b"other"))


@pytest.mark.parametrize(
    "overrides",
    [
        {"sha256": "0" * 64},
        {"duration_ms": 3 * 60 * 60 * 1000},
        {"duration_ms": 0},
        {"mime": "video/mp4"},
        {"data": b"", "sha256": hashlib.sha256(b"").hexdigest()},
        {"seq": -1},
    ],
)
def test_rejects_bad_chunks(store: SessionStore, overrides: dict) -> None:
    session_id = store.create("", [])
    with pytest.raises(ChunkRejected):
        transcribe_chunk(store, FakeTranscriber(), session_id, upload(**overrides))


def test_rejects_oversize_chunk(store: SessionStore) -> None:
    session_id = store.create("", [])
    big = b"x" * (8 * 1024 * 1024 + 1)
    with pytest.raises(ChunkRejected):
        transcribe_chunk(store, FakeTranscriber(), session_id, upload(data=big))


def test_provider_failure_keeps_audio_and_allows_retry(store: SessionStore) -> None:
    session_id = store.create("", [])

    def broken(path: Path, mime: str, prompt: str) -> TranscriptionResult:
        raise ConnectionError("groq unavailable")

    with pytest.raises(TranscriptionFailed):
        transcribe_chunk(store, broken, session_id, upload())
    assert (store.root / session_id / "00001.webm").exists()
    assert store.result(session_id, 1) is None

    retried = transcribe_chunk(store, FakeTranscriber(Segment(0, 1, "ok")), session_id, upload())
    assert [s.text for s in retried.segments] == ["ok"]
