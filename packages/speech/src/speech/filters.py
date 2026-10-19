"""Drop segments Whisper invents over silence or noise.

Measured on Groq (October 2026): `no_speech_prob` is always 0, so it cannot be
relied on. Over silence Whisper either echoes the prompt ("and the F1 score is
the harmonic.") or emits a stock phrase ("Thank you."); over hum it produces
low-confidence nonsense. The browser skips mostly-silent chunks; these rules
are the second line of defence.
"""

import re
from dataclasses import replace

from speech.types import DroppedSegment, Segment, TranscriptionResult

MIN_AVG_LOGPROB = -1.0
MAX_COMPRESSION_RATIO = 2.4
NO_SPEECH_PROB = 0.6  # kept for providers that report it
PROMPT_ECHO_OVERLAP = 0.8
PROMPT_ECHO_MIN_WORDS = 3

STOCK_PHRASES = frozenset(
    {
        "thank you",
        "thanks",
        "thank you very much",
        "thanks for watching",
        "thank you for watching",
        "please subscribe",
        "bye",
        "you",
        "so lets go",
        "subtitles by the amaraorg community",
    }
)


def drop_phantoms(result: TranscriptionResult, prompt: str = "") -> TranscriptionResult:
    prompt_words = set(_words(prompt))
    kept: list[Segment] = []
    dropped = list(result.dropped)
    for segment in result.segments:
        reason = _reason(segment, prompt_words)
        if reason:
            dropped.append(DroppedSegment(segment, reason))
        else:
            kept.append(segment)
    return replace(result, segments=kept, dropped=dropped)


def _reason(segment: Segment, prompt_words: set[str]) -> str | None:
    words = _words(segment.text)
    if not words:
        return "empty"
    if segment.no_speech_prob > NO_SPEECH_PROB:
        return "no_speech"
    if segment.avg_logprob < MIN_AVG_LOGPROB:
        return "low_confidence"
    if segment.compression_ratio > MAX_COMPRESSION_RATIO:
        return "repetition"
    if prompt_words and len(words) >= PROMPT_ECHO_MIN_WORDS:
        overlap = sum(w in prompt_words for w in words) / len(words)
        if overlap >= PROMPT_ECHO_OVERLAP:
            return "prompt_echo"
    # A segment that is only a stock phrase is dropped at any length: the
    # silence phantom spans the whole chunk, and losing a real "thank you" is harmless.
    if " ".join(words) in STOCK_PHRASES:
        return "stock_phrase"
    return None


def _words(text: str) -> list[str]:
    return re.sub(r"[^a-z0-9 ]", "", text.lower()).split()
