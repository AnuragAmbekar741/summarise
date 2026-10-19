"""Score one configuration's hypothesis against a lecture's reference window."""

from collections import Counter
from dataclasses import asdict, dataclass

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


def score(lecture: Lecture, session: Session, hypothesis: Hypothesis) -> Score:
    window = in_window(hypothesis.segments, lecture.start_ms, lecture.end_ms)
    reference = normalize(lecture.reference)
    words: list[str] = []
    boundaries: list[int] = []
    for i, segment in enumerate(window):
        if i and hypothesis.chunks is not None and segment.seq != window[i - 1].seq:
            boundaries.append(len(words))
        words += normalize(segment.text)

    wer, alignment = word_error_rate(reference, words)
    terms = lecture.vocabulary or session.vocabulary
    recall, counts = vocabulary_recall(reference, words, [normalize(t) for t in terms])

    chunked = hypothesis.chunks is not None
    errors = boundary_errors(alignment, boundaries) if chunked else None
    lecture_hours = session.duration_ms / 3_600_000
    p50 = percentile(hypothesis.latencies_ms, 0.5)
    p95 = percentile(hypothesis.latencies_ms, 0.95)
    return Score(
        config=hypothesis.config,
        wer=round(wer.wer, 4),
        substitutions=wer.substitutions,
        deletions=wer.deletions,
        insertions=wer.insertions,
        reference_words=wer.reference_words,
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
        student_turns_labelled=student_turns_labelled(lecture, hypothesis.segments),
        latency_p50_ms=None if p50 is None else round(p50),
        latency_p95_ms=None if p95 is None else round(p95),
        cost_usd=round(hypothesis.cost_usd(), 4),
        cost_per_lecture_hour=(
            round(hypothesis.cost_usd() / lecture_hours, 4) if lecture_hours else None
        ),
    )


def student_turns_labelled(lecture: Lecture, segments: list[Segment]) -> float | None:
    """Share of reference student turns that fall in an utterance from a non-dominant speaker.

    None when the transcript has no speaker labels or the reference has no student turns.
    """
    if not lecture.student_turns or not any(s.speaker for s in segments):
        return None
    words_by_speaker: Counter[str] = Counter()
    for s in segments:
        words_by_speaker[s.speaker or ""] += len(s.text.split())
    instructor = words_by_speaker.most_common(1)[0][0]

    window = in_window(segments, lecture.start_ms, lecture.end_ms)
    found = 0
    for turn in lecture.student_turns:
        tokens = set(normalize(turn))
        if not tokens:
            continue
        best = max(window, key=lambda s: len(tokens & set(normalize(s.text))), default=None)
        if best is None:
            continue
        overlap = len(tokens & set(normalize(best.text))) / len(tokens)
        if overlap >= 0.5 and best.speaker != instructor:
            found += 1
    return round(found / len(lecture.student_turns), 4)


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
