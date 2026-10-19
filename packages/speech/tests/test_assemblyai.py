import json
from pathlib import Path

import httpx
import pytest

from speech.assemblyai import AssemblyAIError, make_client, transcribe_file

DONE = {
    "status": "completed",
    "audio_duration": 18,
    "utterances": [
        {"speaker": "A", "start": 0, "end": 9500, "text": "Precision is the share."},
        {"speaker": "B", "start": 9800, "end": 12000, "text": " Is this on the exam?"},
    ],
}


def fake_api(statuses: list[dict]) -> tuple[httpx.MockTransport, list[httpx.Request]]:
    seen: list[httpx.Request] = []
    polls = iter(statuses)

    def handler(request: httpx.Request) -> httpx.Response:
        seen.append(request)
        if request.url.path == "/v2/upload":
            return httpx.Response(200, json={"upload_url": "https://cdn/upload/1"})
        if request.method == "POST" and request.url.path == "/v2/transcript":
            return httpx.Response(200, json={"id": "t1", "status": "queued"})
        return httpx.Response(200, json=next(polls))

    return httpx.MockTransport(handler), seen


def audio(tmp_path: Path) -> Path:
    path = tmp_path / "lecture.webm"
    path.write_bytes(b"audio")
    return path


def test_uploads_requests_speakers_and_polls(tmp_path: Path) -> None:
    transport, seen = fake_api([{"status": "processing"}, DONE])
    client = make_client("key", transport)

    result = transcribe_file(audio(tmp_path), client=client, poll_seconds=0)

    assert seen[0].content == b"audio"
    assert seen[0].headers["authorization"] == "key"
    assert json.loads(seen[1].content) == {
        "audio_url": "https://cdn/upload/1",
        "speaker_labels": True,
        "language_code": "en",
    }
    assert len(seen) == 4  # upload, create, two polls
    assert result.audio_seconds == 18.0
    assert [(u.speaker, u.start, u.end) for u in result.utterances] == [
        ("A", 0.0, 9.5),
        ("B", 9.8, 12.0),
    ]
    assert result.text == "Precision is the share. Is this on the exam?"


def test_raises_on_error_status(tmp_path: Path) -> None:
    transport, _ = fake_api([{"status": "error", "error": "audio too short"}])
    with pytest.raises(AssemblyAIError, match="audio too short"):
        transcribe_file(audio(tmp_path), client=make_client("key", transport), poll_seconds=0)


def test_times_out(tmp_path: Path) -> None:
    transport, _ = fake_api([{"status": "processing"}] * 10)
    with pytest.raises(AssemblyAIError, match="timed out"):
        transcribe_file(
            audio(tmp_path),
            client=make_client("key", transport),
            poll_seconds=0,
            timeout_seconds=0,
        )
