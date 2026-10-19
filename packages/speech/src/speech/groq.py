"""Groq Whisper: one audio file in, timed segments out."""

import time
from pathlib import Path
from typing import Any

from groq import Groq

from speech.types import Segment, TranscriptionResult

TURBO = "whisper-large-v3-turbo"
LARGE_V3 = "whisper-large-v3"

# The SDK retries 408, 409, 429 and 5xx with backoff and honours retry-after;
# a 400 (bad audio, bad params) is raised at once.
MAX_RETRIES = 3
TIMEOUT_SECONDS = 60.0


def make_client(api_key: str | None = None) -> Groq:
    return Groq(api_key=api_key, max_retries=MAX_RETRIES, timeout=TIMEOUT_SECONDS)


def transcribe(
    path: Path,
    *,
    client: Any,
    model: str = TURBO,
    language: str = "en",
    prompt: str = "",
    mime: str | None = None,
) -> TranscriptionResult:
    file: tuple[str, bytes] | tuple[str, bytes, str] = (path.name, path.read_bytes())
    if mime:
        file = (path.name, path.read_bytes(), mime)

    started = time.perf_counter()
    response = client.audio.transcriptions.create(
        file=file,
        model=model,
        response_format="verbose_json",
        timestamp_granularities=["segment"],
        temperature=0,
        language=language,
        **({"prompt": prompt} if prompt else {}),
    )
    latency_ms = round((time.perf_counter() - started) * 1000)

    data = response.model_dump()
    return TranscriptionResult(
        model=model,
        segments=[_segment(s) for s in data.get("segments") or []],
        audio_seconds=float(data.get("duration") or 0.0),
        latency_ms=latency_ms,
    )


def _segment(raw: dict[str, Any]) -> Segment:
    return Segment(
        start=float(raw["start"]),
        end=float(raw["end"]),
        text=str(raw["text"]).strip(),
        no_speech_prob=float(raw.get("no_speech_prob") or 0.0),
        avg_logprob=float(raw.get("avg_logprob") or 0.0),
        compression_ratio=float(raw.get("compression_ratio") or 1.0),
    )
