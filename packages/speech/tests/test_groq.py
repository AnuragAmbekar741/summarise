from pathlib import Path
from types import SimpleNamespace
from typing import Any

from speech.groq import TURBO, transcribe

RESPONSE = {
    "text": " Precision is the share of predicted positives that are correct.",
    "duration": 18.63,
    "segments": [
        {
            "start": 0,
            "end": 4.5,
            "text": " Precision is the share",
            "avg_logprob": -0.09,
            "compression_ratio": 1.63,
            "no_speech_prob": 0,
        },
        {
            "start": 4.5,
            "end": 9.0,
            "text": " of predicted positives that are correct.",
            "avg_logprob": -0.2,
            "compression_ratio": 1.4,
            "no_speech_prob": 0.01,
        },
    ],
}


class FakeClient:
    def __init__(self, response: dict[str, Any]) -> None:
        self.calls: list[dict[str, Any]] = []
        self.audio = SimpleNamespace(transcriptions=SimpleNamespace(create=self._create))
        self._response = response

    def _create(self, **kwargs: Any) -> Any:
        self.calls.append(kwargs)
        return SimpleNamespace(model_dump=lambda: self._response)


def audio_file(tmp_path: Path) -> Path:
    path = tmp_path / "00001.webm"
    path.write_bytes(b"fake-audio")
    return path


def test_sends_verbose_json_request(tmp_path: Path) -> None:
    client = FakeClient(RESPONSE)
    transcribe(audio_file(tmp_path), client=client, prompt="precision, recall.")

    call = client.calls[0]
    assert call["file"] == ("00001.webm", b"fake-audio")
    assert call["model"] == TURBO
    assert call["response_format"] == "verbose_json"
    assert call["timestamp_granularities"] == ["segment"]
    assert call["temperature"] == 0
    assert call["language"] == "en"
    assert call["prompt"] == "precision, recall."


def test_omits_empty_prompt_and_passes_mime(tmp_path: Path) -> None:
    client = FakeClient(RESPONSE)
    transcribe(audio_file(tmp_path), client=client, mime="audio/webm")

    call = client.calls[0]
    assert "prompt" not in call
    assert call["file"] == ("00001.webm", b"fake-audio", "audio/webm")


def test_parses_segments_and_duration(tmp_path: Path) -> None:
    result = transcribe(audio_file(tmp_path), client=FakeClient(RESPONSE))

    assert result.audio_seconds == 18.63
    assert [s.text for s in result.segments] == [
        "Precision is the share",
        "of predicted positives that are correct.",
    ]
    assert result.segments[1].no_speech_prob == 0.01
    assert result.text == "Precision is the share of predicted positives that are correct."
    assert result.latency_ms >= 0


def test_no_segments_means_empty_result(tmp_path: Path) -> None:
    result = transcribe(audio_file(tmp_path), client=FakeClient({"duration": 30.0}))
    assert result.segments == []
    assert result.text == ""
