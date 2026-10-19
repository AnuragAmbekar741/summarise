"""Score one configuration's hypothesis against a lecture's reference window."""

from collections import Counter
from dataclasses import asdict, dataclass
from difflib import SequenceMatcher

from evals.corpus import Lecture, Segment, Session, in_window
from evals.metrics import percentile
from evals.normalize import normalize
from evals.providers import Hypothesis
from evals.scoring import boundary_errors, vocabulary_recall, word_error_rate

# Stage 0 exit gates (docs/plans/stage-0-proof.md)
GATE_WER = 0.15
GATE_WER_WITH_MIC = 0.25
GATE_TERM_RECALL = 0.85
GATE_BOUNDARY_PER_10_CUTS = 1.0


@dataclass
class Score:
    config: str
    wer: float
    substitutions: int
    deletions: int
    insertions: int
    reference_words: int
    reference_span: list[int]
    term_recall: float | None
    missed_terms: list[str]
    cuts_in_window: int | None
    boundary_errors: int | None
    boundary_errors_per_10_cuts: float | None
    dropped_per_100_chunks: float | None
    student_turns_labelled: float | None
    latency_p50_ms: int | None
    latency_p95_ms: int | None
    cost_usd: float
    cost_per_lecture_hour: float | None

    def to_json(self) -> dict:
        return asdict(self)


def window_words(lecture: Lecture, hypothesis: Hypothesis) -> tuple[list[str], list[int], list]:
    """Hypothesis tokens inside the window, the token indices where chunks change, and segments."""
    window = in_window(hypothesis.segments, lecture.start_ms, lecture.end_ms)
    words: list[str] = []
    boundaries: list[int] = []
    for i, segment in enumerate(window):
        if i and hypothesis.chunks is not None and segment.seq != window[i - 1].seq:
            boundaries.append(len(words))
        words += normalize(segment.text)
    return words, boundaries, window


def align_span(reference: list[str], hypothesis: list[str], min_block: int = 4) -> tuple[int, int]:
    """The reference token range that the hypothesis covers.

    Published transcripts carry no word timings, so the window is found by aligning
    text: the first and last solid matches (runs of `min_block`+ words), extended by
    any hypothesis words outside them.
    """
    if not hypothesis:
        return 0, 0
    matcher = SequenceMatcher(None, reference, hypothesis, autojunk=False)
    blocks = [b for b in matcher.get_matching_blocks() if b.size >= min_block]
    if not blocks:
        return 0, len(reference)
    first, last = blocks[0], blocks[-1]
    start = max(0, first.a - first.b)
    end = min(len(reference), last.a + last.size + (len(hypothesis) - (last.b + last.size)))
    return start, end


def student_turns_in_span(lecture: Lecture, span: tuple[int, int]) -> list[str]:
    turns, offset = [], 0
    for label, text in lecture.turns:
        size = len(normalize(text))
        if label == "Student" and offset < span[1] and offset + size > span[0]:
            turns.append(text)
        offset += size
    return turns


def score(
    lecture: Lecture,
    session: Session,
    hypothesis: Hypothesis,
    span: tuple[int, int] | None = None,
) -> Score:
    words, boundaries, window = window_words(lecture, hypothesis)
    full_reference = normalize(lecture.reference)
    if span is None:
        span = align_span(full_reference, words)
    reference = full_reference[span[0] : span[1]]

    wer, alignment = word_error_rate(reference, words)
    terms = lecture.vocabulary or session.vocabulary
    recall, counts = vocabulary_recall(reference, words, [normalize(t) for t in terms])

    chunked = hypothesis.chunks is not None
    errors = boundary_errors(alignment, boundaries) if chunked else None
    first_start = session.chunks[0].start_ms if session.chunks else 0
    covered_hours = (session.duration_ms - first_start) / 3_600_000
    p50 = percentile(hypothesis.latencies_ms, 0.5)
    p95 = percentile(hypothesis.latencies_ms, 0.95)
    students = student_turns_in_span(lecture, span)
    return Score(
        config=hypothesis.config,
        wer=round(wer.wer, 4),
        substitutions=wer.substitutions,
        deletions=wer.deletions,
        insertions=wer.insertions,
        reference_words=wer.reference_words,
        reference_span=[span[0], span[1]],
        term_recall=None if recall is None else round(recall, 4),
        missed_terms=[c.term for c in counts if c.in_hypothesis < c.in_reference],
        cuts_in_window=len(boundaries) if chunked else None,
        boundary_errors=errors,
        boundary_errors_per_10_cuts=(
            round(10 * errors / len(boundaries), 2) if chunked and boundaries else None
        ),
        dropped_per_100_chunks=(
            round(100 * hypothesis.dropped / hypothesis.chunks, 1) if hypothesis.chunks else None
        ),
        student_turns_labelled=student_turns_labelled(students, window, hypothesis.segments),
        latency_p50_ms=None if p50 is None else round(p50),
        latency_p95_ms=None if p95 is None else round(p95),
        cost_usd=round(hypothesis.cost_usd(), 4),
        cost_per_lecture_hour=(
            round(hypothesis.cost_usd() / covered_hours, 4) if covered_hours else None
        ),
    )


def student_turns_labelled(
    student_turns: list[str], window: list[Segment], segments: list[Segment]
) -> float | None:
    """Share of the window's student turns that land in an utterance from a minority speaker.

    The instructor is whoever speaks most across `segments`. None when the transcript
    has no speaker labels or the window has no student turns.
    """
    if not student_turns or not any(s.speaker for s in segments):
        return None
    words_by_speaker: Counter[str] = Counter()
    for s in segments:
        words_by_speaker[s.speaker or ""] += len(s.text.split())
    instructor = words_by_speaker.most_common(1)[0][0]

    found = 0
    for turn in student_turns:
        tokens = set(normalize(turn))
        if not tokens or not window:
            continue
        best = max(window, key=lambda s: len(tokens & set(normalize(s.text))))
        overlap = len(tokens & set(normalize(best.text))) / len(tokens)
        if overlap >= 0.5 and best.speaker != instructor:
            found += 1
    return round(found / len(student_turns), 4)


def gate_notes(s: Score) -> list[str]:
    notes = []
    if s.wer >= GATE_WER_WITH_MIC:
        notes.append(f"WER {s.wer:.0%} fails (gate 15%, 25% with a mic recommendation)")
    elif s.wer >= GATE_WER:
        notes.append(f"WER {s.wer:.0%} passes only with a mic recommendation")
    if s.term_recall is not None and s.term_recall <= GATE_TERM_RECALL:
        notes.append(f"term recall {s.term_recall:.0%} under 85%")
    if (
        s.boundary_errors_per_10_cuts is not None
        and s.boundary_errors_per_10_cuts >= GATE_BOUNDARY_PER_10_CUTS
    ):
        notes.append(f"{s.boundary_errors_per_10_cuts} boundary errors per 10 cuts (gate under 1)")
    return notes
