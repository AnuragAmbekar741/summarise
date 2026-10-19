from dataclasses import dataclass, field


@dataclass(frozen=True)
class Segment:
    """One Whisper segment. Times are seconds from the start of the audio file."""

    start: float
    end: float
    text: str
    no_speech_prob: float = 0.0
    avg_logprob: float = 0.0
    compression_ratio: float = 1.0


@dataclass(frozen=True)
class DroppedSegment:
    segment: Segment
    reason: str


@dataclass
class TranscriptionResult:
    model: str
    segments: list[Segment]
    audio_seconds: float
    latency_ms: int
    dropped: list[DroppedSegment] = field(default_factory=list)

    @property
    def text(self) -> str:
        return " ".join(s.text.strip() for s in self.segments).strip()
