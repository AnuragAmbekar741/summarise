"""Stage 0: transcribe a chunk inside the request. Stage 2 moves this to a worker job."""

import hashlib
import time
from collections.abc import Callable
from dataclasses import dataclass
from pathlib import Path

from api.modules.proof.schemas import ChunkResult, DroppedOut, SegmentOut
from api.modules.proof.storage import SessionStore, extension_for
from speech.filters import drop_phantoms
from speech.prompt import build_prompt
from speech.types import TranscriptionResult

MAX_CHUNK_BYTES = 8 * 1024 * 1024
MAX_CHUNK_MS = 60_000

# (audio path, mime, prompt) -> raw Whisper result
Transcriber = Callable[[Path, str, str], TranscriptionResult]


class ChunkRejected(ValueError):
    pass


class ChunkConflict(ValueError):
    pass


class TranscriptionFailed(RuntimeError):
    pass


@dataclass(frozen=True)
class ChunkUpload:
    seq: int
    start_ms: int
    duration_ms: int
    sha256: str
    mime: str
    data: bytes
    client_sent_at: float | None = None


def transcribe_chunk(
    store: SessionStore, transcribe: Transcriber, session_id: str, chunk: ChunkUpload
) -> ChunkResult:
    received_at = time.time()
    ext = _validate(chunk)
    meta = store.meta(session_id)

    existing = store.result(session_id, chunk.seq)
    if existing:
        if existing.sha256 != chunk.sha256:
            raise ChunkConflict(f"seq {chunk.seq} already stored with different audio")
        return existing

    prompt = build_prompt(meta["vocabulary"], _previous_text(store, session_id, chunk.seq))
    path = store.save_audio(session_id, chunk.seq, ext, chunk.data)
    try:
        raw = transcribe(path, chunk.mime, prompt)
    except Exception as error:  # provider errors vary; the audio is already saved
        raise TranscriptionFailed(str(error)) from error
    result = drop_phantoms(raw, prompt)

    def ms(seconds: float) -> int:
        return chunk.start_ms + round(seconds * 1000)

    chunk_result = ChunkResult(
        seq=chunk.seq,
        start_ms=chunk.start_ms,
        duration_ms=chunk.duration_ms,
        bytes=len(chunk.data),
        sha256=chunk.sha256,
        mime=chunk.mime,
        segments=[
            SegmentOut(seq=chunk.seq, start_ms=ms(s.start), end_ms=ms(s.end), text=s.text)
            for s in result.segments
        ],
        dropped=[
            DroppedOut(
                start_ms=ms(d.segment.start),
                end_ms=ms(d.segment.end),
                text=d.segment.text,
                reason=d.reason,
            )
            for d in result.dropped
        ],
        model=result.model,
        audio_seconds=result.audio_seconds,
        groq_latency_ms=result.latency_ms,
        client_sent_at=chunk.client_sent_at,
        server_received_at=received_at,
        server_done_at=time.time(),
    )
    store.save_result(session_id, chunk_result)
    return chunk_result


def _validate(chunk: ChunkUpload) -> str:
    if chunk.seq < 0 or chunk.start_ms < 0:
        raise ChunkRejected("seq and start_ms must be non-negative")
    if not 0 < chunk.duration_ms <= MAX_CHUNK_MS:
        raise ChunkRejected(f"duration_ms must be between 1 and {MAX_CHUNK_MS}")
    if not chunk.data:
        raise ChunkRejected("empty file")
    if len(chunk.data) > MAX_CHUNK_BYTES:
        raise ChunkRejected(f"file over {MAX_CHUNK_BYTES} bytes")
    if hashlib.sha256(chunk.data).hexdigest() != chunk.sha256.lower():
        raise ChunkRejected("sha256 does not match the file")
    ext = extension_for(chunk.mime)
    if ext is None:
        raise ChunkRejected(f"unsupported audio type {chunk.mime}")
    return ext


def _previous_text(store: SessionStore, session_id: str, seq: int) -> str:
    """Text of the latest stored chunk before `seq`; silent chunks are never uploaded."""
    earlier = [r for r in store.results(session_id) if r.seq < seq]
    if not earlier:
        return ""
    return " ".join(s.text for s in earlier[-1].segments)
