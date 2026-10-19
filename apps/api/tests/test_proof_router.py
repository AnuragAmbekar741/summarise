import hashlib
from collections.abc import Iterator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from api.main import app
from api.modules.proof.router import get_store, get_transcriber
from api.modules.proof.storage import SessionStore
from speech.types import Segment, TranscriptionResult

AUDIO = b"opus-bytes"


def fake_transcriber(path: Path, mime: str, prompt: str) -> TranscriptionResult:
    if path.read_bytes() == b"fail":
        raise ConnectionError("groq down")
    return TranscriptionResult(
        model="whisper-large-v3-turbo",
        segments=[
            Segment(start=0.5, end=2.0, text=f"chunk {path.stem}", avg_logprob=-0.2),
            Segment(start=2.0, end=30.0, text="Thank you.", avg_logprob=-0.3),
        ],
        audio_seconds=30.0,
        latency_ms=300,
    )


@pytest.fixture
def client(tmp_path: Path) -> Iterator[TestClient]:
    store = SessionStore(tmp_path)
    app.dependency_overrides[get_store] = lambda: store
    app.dependency_overrides[get_transcriber] = lambda: fake_transcriber
    yield TestClient(app)
    app.dependency_overrides.clear()


def session(client: TestClient) -> str:
    response = client.post("/api/proof/sessions", json={"label": "test", "vocabulary": ["recall"]})
    assert response.status_code == 201
    return response.json()["session_id"]


def post_chunk(client: TestClient, session_id: str, seq: int, data: bytes = AUDIO, **form):
    fields = {
        "seq": seq,
        "start_ms": seq * 30_000,
        "duration_ms": 30_000,
        "sha256": hashlib.sha256(data).hexdigest(),
        "client_sent_at": 1_700_000_000.5,
    } | form
    return client.post(
        f"/api/proof/sessions/{session_id}/chunks",
        data=fields,
        files={"file": ("chunk.webm", data, "audio/webm;codecs=opus")},
    )


def test_upload_returns_lecture_time_segments(client: TestClient) -> None:
    session_id = session(client)

    response = post_chunk(client, session_id, 2)

    assert response.status_code == 200
    body = response.json()
    assert body["seq"] == 2
    assert body["segments"] == [
        {"seq": 2, "start_ms": 60_500, "end_ms": 62_000, "text": "chunk 00002"}
    ]
    assert body["dropped_count"] == 1
    assert body["groq_latency_ms"] == 300


def test_segments_lists_chunks_in_order(client: TestClient) -> None:
    session_id = session(client)
    post_chunk(client, session_id, 3, b"three")
    post_chunk(client, session_id, 1, b"one")

    body = client.get(f"/api/proof/sessions/{session_id}/segments").json()

    assert body["chunks"] == 2
    assert [s["text"] for s in body["segments"]] == ["chunk 00001", "chunk 00003"]


def test_reupload_is_idempotent_and_conflict_is_409(client: TestClient) -> None:
    session_id = session(client)
    first = post_chunk(client, session_id, 1).json()
    assert post_chunk(client, session_id, 1).json() == first
    assert post_chunk(client, session_id, 1, b"different").status_code == 409


def test_bad_hash_is_422(client: TestClient) -> None:
    session_id = session(client)
    assert post_chunk(client, session_id, 1, sha256="0" * 64).status_code == 422


def test_unknown_session_is_404(client: TestClient) -> None:
    missing = "019a0000-0000-7000-8000-000000000000"
    assert post_chunk(client, missing, 1).status_code == 404
    assert client.get(f"/api/proof/sessions/{missing}/segments").status_code == 404


def test_provider_failure_is_502(client: TestClient) -> None:
    session_id = session(client)
    assert post_chunk(client, session_id, 1, b"fail").status_code == 502
