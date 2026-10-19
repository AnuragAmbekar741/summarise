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
    prompt_words = _words(prompt)
    kept: list[Segment] = []
    dropped = list(result.dropped)
    for segment in result.segments:
        reason = _reason(segment, prompt_words)
        if reason:
            dropped.append(DroppedSegment(segment, reason))
        else:
            kept.append(segment)
    return replace(result, segments=kept, dropped=dropped)


def _reason(segment: Segment, prompt_words: list[str]) -> str | None:
    words = _words(segment.text)
    if not words:
        return "empty"
    if segment.no_speech_prob > NO_SPEECH_PROB:
        return "no_speech"
    if segment.avg_logprob < MIN_AVG_LOGPROB:
        return "low_confidence"
    if segment.compression_ratio > MAX_COMPRESSION_RATIO:
        return "repetition"
    # Whisper echoes the prompt verbatim, so only a contiguous run of prompt words
    # counts. A bag-of-words test dropped real speech such as "I guess not. Good."
    # whenever the previous chunk happened to contain those words.
    if len(words) >= PROMPT_ECHO_MIN_WORDS and _is_run_of(words, prompt_words):
        return "prompt_echo"
    # A segment that is only a stock phrase is dropped at any length: the
    # silence phantom spans the whole chunk, and losing a real "thank you" is harmless.
    if " ".join(words) in STOCK_PHRASES:
        return "stock_phrase"
    return None


def _is_run_of(words: list[str], text: list[str]) -> bool:
    """True when `words` appear in `text` in order and adjacent. From six words
    on, the last word may differ: Whisper often changes the end of an echo."""
    n = len(words)
    need = n - 1 if n >= 6 else n
    for i in range(len(text) - need + 1):
        if text[i : i + need] == words[:need]:
            return True
    return False


def _words(text: str) -> list[str]:
    return re.sub(r"[^a-z0-9 ]", "", text.lower()).split()
