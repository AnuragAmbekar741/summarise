from pathlib import Path

import pytest

from evals.corpus import load_session
from evals.providers import (
    ASSEMBLYAI_FULL,
    GROQ_TURBO_CHUNKS,
    GROQ_V3_CHUNKS,
    Hypothesis,
    full_file_assemblyai,
    full_file_groq,
    live_chunks,
    rerun_chunks,
)
from speech.assemblyai import DiarizedTranscript, Utterance
from speech.types import Segment as WhisperSegment
from speech.types import TranscriptionResult


class FakeWhisper:
    def __init__(self) -> None:
        self.prompts: list[str] = []

    def __call__(self, path: Path, prompt: str) -> TranscriptionResult:
        self.prompts.append(prompt)
        return TranscriptionResult(
            model="m",
            segments=[
                WhisperSegment(0.5, 2.0, f"words from {path.stem}", avg_logprob=-0.2),
                WhisperSegment(2.0, 3.0, "Thank you.", avg_logprob=-0.3),
            ],
            audio_seconds=4.0,
            latency_ms=250,
        )


def test_live_chunks_reads_stored_results(data_dir: Path) -> None:
    h = live_chunks(load_session("s1", data_dir))
    assert h.config == GROQ_TURBO_CHUNKS
    assert h.segments[0].text == "today we cover precision"
    assert h.chunks == 3 and h.requests == 3
    assert h.dropped == 1
    assert h.dropped_segments == [{"start_ms": 0, "text": "Thank you.", "reason": "stock_phrase"}]
    assert h.latencies_ms == [301, 302, 303]
    assert h.audio_seconds == pytest.approx(83.0)


def test_rerun_chunks_chains_prompts_and_moves_to_lecture_time(data_dir: Path) -> None:
    fake = FakeWhisper()
    h = rerun_chunks(load_session("s1", data_dir), fake, GROQ_V3_CHUNKS)

    assert fake.prompts[0] == "precision, F1 score."
    assert fake.prompts[1] == "precision, F1 score. words from 00001"
    assert [(s.seq, s.start_ms, s.end_ms) for s in h.segments] == [
        (1, 500, 2_000),
        (2, 30_500, 32_000),
        (3, 70_500, 72_000),
    ]
    assert h.dropped == 3
    assert h.dropped_segments[1] == {
        "start_ms": 32_000,
        "text": "Thank you.",
        "reason": "stock_phrase",
    }
    # Groq bills at least 10 s per request: 3 chunks of 4 s bill 30 s.
    assert h.billed_seconds == 30.0
    assert h.cost_usd() == pytest.approx(30 / 3600 * 0.111)


def test_full_file_groq_offsets_parts() -> None:
    fake = FakeWhisper()
    parts = [(Path("part-01.ogg"), 0), (Path("part-02.ogg"), 3_000_000)]
    h = full_file_groq(parts, fake, ["precision"])
    assert fake.prompts == ["precision.", "precision."]
    assert [s.start_ms for s in h.segments] == [500, 3_000_500]
    assert h.requests == 2


def test_full_file_assemblyai_keeps_speakers() -> None:
    def fake(path: Path) -> DiarizedTranscript:
        return DiarizedTranscript(
            utterances=[
                Utterance("A", 0.0, 9.5, "Lecture."),
                Utterance("B", 9.8, 12.0, "Question?"),
            ],
            audio_seconds=3600.0,
            latency_ms=90_000,
        )

    h = full_file_assemblyai(Path("lecture.ogg"), 540_000, fake)
    assert h.config == ASSEMBLYAI_FULL
    assert [(s.speaker, s.start_ms) for s in h.segments] == [("A", 540_000), ("B", 549_800)]
    assert h.cost_usd() == pytest.approx(0.17)


def test_hypothesis_json_round_trip(data_dir: Path) -> None:
    h = live_chunks(load_session("s1", data_dir))
    assert Hypothesis.from_json(h.to_json()) == h
