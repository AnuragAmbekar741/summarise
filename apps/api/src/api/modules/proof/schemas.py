from pydantic import BaseModel, Field


class SessionCreate(BaseModel):
    label: str = Field(default="", max_length=200)
    vocabulary: list[str] = Field(default_factory=list, max_length=500)


class SessionOut(BaseModel):
    session_id: str


class SegmentOut(BaseModel):
    """A kept segment. Times are milliseconds on the lecture clock."""

    seq: int
    start_ms: int
    end_ms: int
    text: str


class DroppedOut(BaseModel):
    start_ms: int
    end_ms: int
    text: str
    reason: str


class ChunkResult(BaseModel):
    seq: int
    start_ms: int
    duration_ms: int
    bytes: int
    sha256: str
    mime: str
    segments: list[SegmentOut]
    dropped: list[DroppedOut]
    model: str
    audio_seconds: float
    groq_latency_ms: int
    client_sent_at: float | None
    server_received_at: float
    server_done_at: float


class ChunkOut(BaseModel):
    seq: int
    segments: list[SegmentOut]
    dropped_count: int
    server_received_at: float
    groq_latency_ms: int


class SegmentsOut(BaseModel):
    segments: list[SegmentOut]
    chunks: int
