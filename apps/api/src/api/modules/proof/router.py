from functools import lru_cache
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status

from api.modules.proof.schemas import ChunkOut, SegmentsOut, SessionCreate, SessionOut
from api.modules.proof.service import (
    MAX_CHUNK_BYTES,
    ChunkConflict,
    ChunkRejected,
    ChunkUpload,
    Transcriber,
    TranscriptionFailed,
    transcribe_chunk,
)
from api.modules.proof.storage import SessionNotFound, SessionStore
from api.settings import get_settings
from speech import groq
from speech.types import TranscriptionResult

router = APIRouter(prefix="/api/proof", tags=["proof"])


@lru_cache
def get_store() -> SessionStore:
    return SessionStore(get_settings().data_dir)


@lru_cache
def get_transcriber() -> Transcriber:
    settings = get_settings()
    if not settings.groq_api_key:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "GROQ_API_KEY is not set")
    client = groq.make_client(settings.groq_api_key)

    def transcribe(path: Path, mime: str, prompt: str) -> TranscriptionResult:
        return groq.transcribe(
            path, client=client, model=settings.groq_model, mime=mime, prompt=prompt
        )

    return transcribe


Store = Annotated[SessionStore, Depends(get_store)]


@router.post("/sessions", status_code=status.HTTP_201_CREATED)
def create_session(body: SessionCreate, store: Store) -> SessionOut:
    return SessionOut(session_id=store.create(body.label, body.vocabulary))


@router.post("/sessions/{session_id}/chunks")
def upload_chunk(
    session_id: str,
    store: Store,
    transcribe: Annotated[Transcriber, Depends(get_transcriber)],
    file: Annotated[UploadFile, File()],
    seq: Annotated[int, Form()],
    start_ms: Annotated[int, Form()],
    duration_ms: Annotated[int, Form()],
    sha256: Annotated[str, Form()],
    client_sent_at: Annotated[float | None, Form()] = None,
) -> ChunkOut:
    chunk = ChunkUpload(
        seq=seq,
        start_ms=start_ms,
        duration_ms=duration_ms,
        sha256=sha256,
        mime=file.content_type or "",
        data=file.file.read(MAX_CHUNK_BYTES + 1),
        client_sent_at=client_sent_at,
    )
    try:
        result = transcribe_chunk(store, transcribe, session_id, chunk)
    except SessionNotFound:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "session not found") from None
    except ChunkRejected as error:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, str(error)) from None
    except ChunkConflict as error:
        raise HTTPException(status.HTTP_409_CONFLICT, str(error)) from None
    except TranscriptionFailed as error:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, f"transcription failed: {error}") from None

    return ChunkOut(
        seq=result.seq,
        segments=result.segments,
        dropped_count=len(result.dropped),
        server_received_at=result.server_received_at,
        groq_latency_ms=result.groq_latency_ms,
    )


@router.get("/sessions/{session_id}/segments")
def list_segments(session_id: str, store: Store) -> SegmentsOut:
    try:
        results = store.results(session_id)
    except SessionNotFound:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "session not found") from None
    return SegmentsOut(segments=[s for r in results for s in r.segments], chunks=len(results))
