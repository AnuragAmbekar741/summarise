"""Scores for a hypothesis transcript against a hand-corrected reference.

All inputs are normalised token lists (see `normalize`).
"""

from collections.abc import Sequence
from dataclasses import dataclass

import jiwer


@dataclass(frozen=True)
class WerResult:
    wer: float
    hits: int
    substitutions: int
    deletions: int
    insertions: int
    reference_words: int
    hypothesis_words: int


@dataclass(frozen=True)
class Alignment:
    """One aligned run; `kind` is equal, substitute, delete or insert. Indices are half-open."""

    kind: str
    ref_start: int
    ref_end: int
    hyp_start: int
    hyp_end: int


def word_error_rate(
    reference: Sequence[str], hypothesis: Sequence[str]
) -> tuple[WerResult, list[Alignment]]:
    if not reference:
        raise ValueError("reference is empty")
    if not hypothesis:
        result = WerResult(1.0, 0, 0, len(reference), 0, len(reference), 0)
        return result, [Alignment("delete", 0, len(reference), 0, 0)]

    out = jiwer.process_words(" ".join(reference), " ".join(hypothesis))
    alignment = [
        Alignment(a.type, a.ref_start_idx, a.ref_end_idx, a.hyp_start_idx, a.hyp_end_idx)
        for a in out.alignments[0]
    ]
    result = WerResult(
        wer=out.wer,
        hits=out.hits,
        substitutions=out.substitutions,
        deletions=out.deletions,
        insertions=out.insertions,
        reference_words=len(reference),
        hypothesis_words=len(hypothesis),
    )
    return result, alignment


def count_phrase(tokens: Sequence[str], phrase: Sequence[str]) -> int:
    if not phrase:
        return 0
    n = len(phrase)
    return sum(1 for i in range(len(tokens) - n + 1) if list(tokens[i : i + n]) == list(phrase))


@dataclass(frozen=True)
class TermCount:
    term: str
    in_reference: int
    in_hypothesis: int


def vocabulary_recall(
    reference: Sequence[str], hypothesis: Sequence[str], terms: Sequence[Sequence[str]]
) -> tuple[float | None, list[TermCount]]:
    """Share of the reference's term occurrences that the hypothesis also has.

    `terms` are normalised token sequences. None when no term occurs in the reference.
    """
    counts = [
        TermCount(" ".join(t), count_phrase(reference, t), count_phrase(hypothesis, t))
        for t in terms
    ]
    present = sum(c.in_reference for c in counts)
    if not present:
        return None, counts
    found = sum(min(c.in_reference, c.in_hypothesis) for c in counts)
    return found / present, counts


def boundary_errors(
    alignment: Sequence[Alignment], boundaries: Sequence[int], radius: int = 2
) -> int:
    """Cuts with at least one recognition error within `radius` hypothesis words.

    `boundaries` are hypothesis word indices where a new chunk starts. A split or
    doubled word at a cut shows up as an error right at that index.
    """
    errors = [a for a in alignment if a.kind != "equal"]
    hit = 0
    for b in boundaries:
        lo, hi = b - radius, b + radius
        for a in errors:
            if a.hyp_start == a.hyp_end:  # deletion: a point in the hypothesis
                touches = lo <= a.hyp_start <= hi
            else:
                touches = a.hyp_start < hi and a.hyp_end > lo
            if touches:
                hit += 1
                break
    return hit
