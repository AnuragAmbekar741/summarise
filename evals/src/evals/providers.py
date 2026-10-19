"""Transcribe one recorded session with each configuration under comparison.

Every function takes the provider call as a parameter, so tests run without keys.
"""

from collections.abc import Callable
from dataclasses import asdict, dataclass, field
from pathlib import Path

from evals.corpus import Segment, Session
from speech.assemblyai import DiarizedTranscript
from speech.filters import drop_phantoms
from speech.prompt import build_prompt
from speech.types import TranscriptionResult

GROQ_TURBO_CHUNKS = "groq-turbo-chunks"
GROQ_V3_CHUNKS = "groq-v3-chunks"
GROQ_TURBO_FULL = "groq-turbo-full"
ASSEMBLYAI_FULL = "assemblyai-full"
CONFIGS = [GROQ_TURBO_CHUNKS, GROQ_V3_CHUNKS, GROQ_TURBO_FULL, ASSEMBLYAI_FULL]

# USD per hour of billed audio. October 2026 research snapshot from the PRD;
# confirm on the provider pricing pages before using a number in a decision.
USD_PER_HOUR = {
    GROQ_TURBO_CHUNKS: 0.04,
    GROQ_V3_CHUNKS: 0.111,
    GROQ_TURBO_FULL: 0.04,
    ASSEMBLYAI_FULL: 0.15 + 0.02,  # Universal file rate + speaker labels
}
GROQ_MIN_BILLED_SECONDS = 10.0

# (audio file, prompt) -> raw Whisper result
Transcribe = Callable[[Path, str], TranscriptionResult]


@dataclass
class Hypothesis:
    config: str
    segments: list[Segment]
    audio_seconds: float
    billed_seconds: float
    requests: int
    latencies_ms: list[int]
    dropped: int
    chunks: int | None = None
    notes: list[str] = field(default_factory=list)
    # What the phantom filters removed: {"start_ms", "text", "reason"}, for tuning them.
    dropped_segments: list[dict] = field(default_factory=list)

    def cost_usd(self) -> float:
        return self.billed_seconds / 3600 * USD_PER_HOUR[self.config]

    def to_json(self) -> dict:
        return asdict(self)

    @classmethod
    def from_json(cls, data: dict) -> Hypothesis:
        return cls(**{**data, "segments": [Segment(**s) for s in data["segments"]]})


def _groq_billed(seconds: float) -> float:
    return max(GROQ_MIN_BILLED_SECONDS, seconds)


def live_chunks(session: Session) -> Hypothesis:
    """What ran during the lecture: Groq Turbo per chunk, as stored by the API."""
    segments = [
        Segment(r["seq"], s["start_ms"], s["end_ms"], s["text"])
        for r in session.results
        for s in r["segments"]
    ]
    return Hypothesis(
        config=GROQ_TURBO_CHUNKS,
        segments=segments,
        audio_seconds=sum(r["audio_seconds"] for r in session.results),
        billed_seconds=sum(_groq_billed(r["audio_seconds"]) for r in session.results),
        requests=len(session.results),
        latencies_ms=[r["groq_latency_ms"] for r in session.results],
        dropped=sum(len(r["dropped"]) for r in session.results),
        chunks=len(session.results),
        dropped_segments=[
            {"start_ms": d["start_ms"], "text": d["text"], "reason": d["reason"]}
            for r in session.results
            for d in r["dropped"]
        ],
    )


def rerun_chunks(session: Session, transcribe: Transcribe, config: str) -> Hypothesis:
    """Each stored chunk again, with the same prompt chain the API builds."""
    segments: list[Segment] = []
    audio = billed = 0.0
    latencies: list[int] = []
    dropped = 0
    dropped_segments: list[dict] = []
    previous = ""
    for chunk in session.chunks:
        prompt = build_prompt(session.vocabulary, previous)
        result = drop_phantoms(transcribe(chunk.path, prompt), prompt)
        kept = [_on_clock(chunk.seq, chunk.start_ms, s) for s in result.segments]
        segments += kept
        audio += result.audio_seconds
        billed += _groq_billed(result.audio_seconds)
        latencies.append(result.latency_ms)
        dropped += len(result.dropped)
        dropped_segments += _dropped(chunk.start_ms, result)
        if kept:
            previous = " ".join(s.text for s in kept)
    return Hypothesis(
        config=config,
        segments=segments,
        audio_seconds=audio,
        billed_seconds=billed,
        requests=len(session.chunks),
        latencies_ms=latencies,
        dropped=dropped,
        chunks=len(session.chunks),
        dropped_segments=dropped_segments,
    )


def full_file_groq(
    parts: list[tuple[Path, int]], transcribe: Transcribe, vocabulary: list[str]
) -> Hypothesis:
    """The whole lecture as file parts; prompt is the vocabulary only."""
    prompt = build_prompt(vocabulary)
    segments: list[Segment] = []
    audio = billed = 0.0
    latencies: list[int] = []
    dropped = 0
    dropped_segments: list[dict] = []
    for index, (path, offset_ms) in enumerate(parts, start=1):
        result = drop_phantoms(transcribe(path, prompt), prompt)
        segments += [_on_clock(index, offset_ms, s) for s in result.segments]
        audio += result.audio_seconds
        billed += _groq_billed(result.audio_seconds)
        latencies.append(result.latency_ms)
        dropped += len(result.dropped)
        dropped_segments += _dropped(offset_ms, result)
    return Hypothesis(
        config=GROQ_TURBO_FULL,
        segments=segments,
        audio_seconds=audio,
        billed_seconds=billed,
        requests=len(parts),
        latencies_ms=latencies,
        dropped=dropped,
        dropped_segments=dropped_segments,
    )


def full_file_assemblyai(
    path: Path, offset_ms: int, transcribe_file: Callable[[Path], DiarizedTranscript]
) -> Hypothesis:
    """One file whose start sits `offset_ms` into the lecture."""
    result = transcribe_file(path)
    segments = [
        Segment(
            1, offset_ms + round(u.start * 1000), offset_ms + round(u.end * 1000), u.text, u.speaker
        )
        for u in result.utterances
    ]
    return Hypothesis(
        config=ASSEMBLYAI_FULL,
        segments=segments,
        audio_seconds=result.audio_seconds,
        billed_seconds=result.audio_seconds,
        requests=1,
        latencies_ms=[result.latency_ms],
        dropped=0,
    )


def _dropped(offset_ms: int, result: TranscriptionResult) -> list[dict]:
    return [
        {
            "start_ms": offset_ms + round(d.segment.start * 1000),
            "text": d.segment.text,
            "reason": d.reason,
        }
        for d in result.dropped
    ]


def _on_clock(seq: int, offset_ms: int, segment) -> Segment:
    return Segment(
        seq,
        offset_ms + round(segment.start * 1000),
        offset_ms + round(segment.end * 1000),
        segment.text,
    )
