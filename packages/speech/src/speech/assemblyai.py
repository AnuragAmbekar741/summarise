"""AssemblyAI: full-file transcription with speaker labels (eval only in stage 0)."""

import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import httpx

BASE_URL = "https://api.assemblyai.com/v2"
POLL_SECONDS = 3.0
TIMEOUT_SECONDS = 1800.0


@dataclass(frozen=True)
class Utterance:
    """One speaker turn. Times are seconds from the start of the file."""

    speaker: str
    start: float
    end: float
    text: str


@dataclass
class DiarizedTranscript:
    utterances: list[Utterance]
    audio_seconds: float
    latency_ms: int

    @property
    def text(self) -> str:
        return " ".join(u.text for u in self.utterances)


class AssemblyAIError(RuntimeError):
    pass


def make_client(api_key: str, transport: httpx.BaseTransport | None = None) -> httpx.Client:
    return httpx.Client(
        base_url=BASE_URL,
        headers={"authorization": api_key},
        timeout=httpx.Timeout(120.0),
        transport=transport,
    )


def transcribe_file(
    path: Path,
    *,
    client: httpx.Client,
    speaker_labels: bool = True,
    language: str = "en",
    poll_seconds: float = POLL_SECONDS,
    timeout_seconds: float = TIMEOUT_SECONDS,
) -> DiarizedTranscript:
    started = time.perf_counter()

    upload = client.post("/upload", content=path.read_bytes())
    upload.raise_for_status()

    job = client.post(
        "/transcript",
        json={
            "audio_url": upload.json()["upload_url"],
            "speaker_labels": speaker_labels,
            "language_code": language,
        },
    )
    job.raise_for_status()
    job_id = job.json()["id"]

    while True:
        response = client.get(f"/transcript/{job_id}")
        response.raise_for_status()
        data = response.json()
        if data["status"] == "completed":
            break
        if data["status"] == "error":
            raise AssemblyAIError(data.get("error") or "transcription failed")
        if time.perf_counter() - started > timeout_seconds:
            raise AssemblyAIError(f"timed out after {timeout_seconds:.0f} s")
        time.sleep(poll_seconds)

    return DiarizedTranscript(
        utterances=[_utterance(u) for u in data.get("utterances") or []],
        audio_seconds=float(data.get("audio_duration") or 0.0),
        latency_ms=round((time.perf_counter() - started) * 1000),
    )


def _utterance(raw: dict[str, Any]) -> Utterance:
    return Utterance(
        speaker=str(raw["speaker"]),
        start=raw["start"] / 1000,
        end=raw["end"] / 1000,
        text=str(raw["text"]).strip(),
    )
