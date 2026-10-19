"""Real provider calls. Run with `make test-live`; costs well under one cent."""

import os
import wave
from pathlib import Path

import pytest

from speech import assemblyai, groq
from speech.filters import drop_phantoms
from speech.prompt import build_prompt

pytestmark = pytest.mark.live

ROOT = Path(__file__).resolve().parents[3]
SAMPLE = Path(__file__).parent / "fixtures" / "lecture.m4a"  # macOS `say`, 18.6 s


def key(name: str) -> str:
    env = ROOT / ".env"
    if env.exists():
        for line in env.read_text().splitlines():
            k, _, v = line.partition("=")
            if k == name and v:
                return v
    value = os.environ.get(name, "")
    if not value:
        pytest.skip(f"{name} not set")
    return value


def silent_wav(path: Path, seconds: int = 30) -> Path:
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(16000)
        w.writeframes(b"\x00\x00" * 16000 * seconds)
    return path


def test_groq_transcribes_sample() -> None:
    client = groq.make_client(key("GROQ_API_KEY"))
    prompt = build_prompt(["precision", "recall", "F1 score"])

    result = drop_phantoms(groq.transcribe(SAMPLE, client=client, prompt=prompt), prompt)

    text = result.text.lower()
    assert "precision" in text
    assert "harmonic mean" in text
    assert "next tuesday" in text
    assert 18 <= result.audio_seconds <= 19.5
    assert result.dropped == []


def test_groq_silence_leaves_no_text(tmp_path: Path) -> None:
    client = groq.make_client(key("GROQ_API_KEY"))
    prompt = build_prompt(["precision", "recall"], "and the F1 score is the harmonic mean")
    silence = silent_wav(tmp_path / "silence.wav")

    for p in ("", prompt):
        result = drop_phantoms(groq.transcribe(silence, client=client, prompt=p), p)
        assert result.segments == [], [d.reason for d in result.dropped]


def test_assemblyai_labels_speakers_on_sample() -> None:
    with assemblyai.make_client(key("ASSEMBLYAI_API_KEY")) as client:
        result = assemblyai.transcribe_file(SAMPLE, client=client)

    assert result.utterances
    assert "precision" in result.text.lower()
    assert all(u.speaker for u in result.utterances)
