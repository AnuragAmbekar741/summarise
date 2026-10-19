"""Whisper prompt: course vocabulary, then the end of the previous chunk.

Whisper reads at most 224 prompt tokens and keeps the last ones, so the
vocabulary is capped (about 150 tokens) and the previous text comes last,
where it does the most for continuity across chunk boundaries.
"""

VOCABULARY_MAX_CHARS = 600
PREVIOUS_MAX_CHARS = 200


def build_prompt(vocabulary: list[str], previous_text: str = "") -> str:
    terms: list[str] = []
    used = 0
    for term in (t.strip() for t in vocabulary):
        if not term:
            continue
        cost = len(term) + 2  # ", "
        if used + cost > VOCABULARY_MAX_CHARS:
            break
        terms.append(term)
        used += cost

    parts = []
    if terms:
        parts.append(", ".join(terms) + ".")
    tail = _tail(previous_text.strip(), PREVIOUS_MAX_CHARS)
    if tail:
        parts.append(tail)
    return " ".join(parts)


def _tail(text: str, limit: int) -> str:
    """Last `limit` characters, starting at a word boundary."""
    if len(text) <= limit:
        return text
    cut = text[-limit:]
    space = cut.find(" ")
    return cut[space + 1 :] if space != -1 else cut
