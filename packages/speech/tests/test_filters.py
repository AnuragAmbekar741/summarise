"""Fixtures are real Groq Whisper Turbo outputs recorded on 2026-10-18."""

import pytest

from speech.filters import drop_phantoms
from speech.types import Segment, TranscriptionResult

PROMPT = "precision, recall. and the F1 score is the harmonic mean"


def seg(text: str, logprob: float, ratio: float = 1.0, start: float = 0.0, end: float = 30.0):
    return Segment(start=start, end=end, text=text, avg_logprob=logprob, compression_ratio=ratio)


def run(*segments: Segment, prompt: str = "") -> TranscriptionResult:
    result = TranscriptionResult(
        model="whisper-large-v3-turbo",
        segments=list(segments),
        audio_seconds=30.0,
        latency_ms=400,
    )
    return drop_phantoms(result, prompt=prompt)


REAL_SPEECH = seg(
    "Today we cover precision and recall. Precision is the share of predicted "
    "positives that are correct.",
    -0.09,
    1.63,
    end=18.5,
)


@pytest.mark.parametrize(
    ("segment", "prompt", "reason"),
    [
        # silence, no prompt
        (seg("Thank you.", -0.29, 0.58), "", "stock_phrase"),
        # silence and faint noise, with prompt: Whisper echoes the prompt
        (seg("and the F1 score is the same.", -1.22, 0.88), PROMPT, "low_confidence"),
        (seg("and the F1 score is the harmonic.", -1.02, 0.89), PROMPT, "low_confidence"),
        # hum, with prompt: the last segment echoes the prompt at normal confidence
        (seg("and the F1 score is the harmonic.", -0.86, 0.89, 26.8, 30.0), PROMPT, "prompt_echo"),
        # hum, with prompt: low-confidence nonsense
        (seg("end to the piano now is the R3 score", -3.92, 1.54), PROMPT, "low_confidence"),
        # hum, no prompt
        (seg("So, let's go.", -0.83, 0.64), "", "stock_phrase"),
        # repetition loop
        (seg("the the the the the the the the", -0.4, 3.1), "", "repetition"),
        (seg("   ", -0.1), "", "empty"),
    ],
)
def test_drops_recorded_phantoms(segment: Segment, prompt: str, reason: str) -> None:
    result = run(segment, prompt=prompt)
    assert result.segments == []
    assert [d.reason for d in result.dropped] == [reason]


def test_keeps_real_speech_with_and_without_prompt() -> None:
    assert run(REAL_SPEECH).segments == [REAL_SPEECH]
    assert run(REAL_SPEECH, prompt=PROMPT).segments == [REAL_SPEECH]


def test_keeps_speech_that_shares_some_words_with_prompt() -> None:
    continuing = seg("the F1 score is useful when classes are imbalanced", -0.3, 1.2)
    assert run(continuing, prompt=PROMPT).segments == [continuing]


def test_keeps_short_segments_from_echo_rule() -> None:
    short = seg("Recall matters.", -0.2)
    assert run(short, prompt=PROMPT).segments == [short]


def test_no_speech_prob_rule_for_providers_that_report_it() -> None:
    noisy = Segment(start=0, end=5, text="hmm okay", no_speech_prob=0.9)
    assert [d.reason for d in run(noisy).dropped] == ["no_speech"]


def test_keeps_order_and_previous_drops() -> None:
    first = seg("First point.", -0.2, start=0, end=5)
    second = seg("Second point.", -0.2, start=6, end=10)
    result = run(first, seg("Thank you.", -0.29), second)
    assert result.segments == [first, second]
    assert len(result.dropped) == 1
    again = drop_phantoms(result)
    assert again.segments == [first, second]
    assert len(again.dropped) == 1
