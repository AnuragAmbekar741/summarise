"""Load recorded sessions (from the API's data dir) and labelled lectures (from the corpus).

evals/corpus/<slug>/
  reference-10min.txt     hand-corrected transcript of the window; one turn per
                          line, "Student:" marks a student turn, "#" is a comment
  reference-window.json   {"session": "<id>", "start_ms": ..., "end_ms": ...}
  vocabulary.txt          one course term per line
"""

import json
from dataclasses import dataclass, field
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
DATA_DIR = ROOT / ".data"
CORPUS_DIR = ROOT / "evals" / "corpus"
RESULTS_DIR = ROOT / "evals" / "results"


@dataclass(frozen=True)
class Segment:
    """A transcript piece on the lecture clock (ms)."""

    seq: int
    start_ms: int
    end_ms: int
    text: str
    speaker: str | None = None


@dataclass(frozen=True)
class Chunk:
    seq: int
    start_ms: int
    duration_ms: int
    mime: str
    path: Path


@dataclass
class Session:
    id: str
    label: str
    vocabulary: list[str]
    folder: Path
    chunks: list[Chunk]
    results: list[dict] = field(default_factory=list)

    @property
    def duration_ms(self) -> int:
        last = self.chunks[-1] if self.chunks else None
        return last.start_ms + last.duration_ms if last else 0


@dataclass
class Lecture:
    slug: str
    folder: Path
    reference: str
    turns: list[tuple[str, str]]  # (label, text); label is "Student", "Instructor" or ""
    student_turns: list[str]
    session_id: str
    start_ms: int
    end_ms: int
    vocabulary: list[str]


def load_session(session_id: str, data_dir: Path = DATA_DIR) -> Session:
    folder = data_dir / "sessions" / session_id
    meta = json.loads((folder / "meta.json").read_text())
    results = [json.loads(p.read_text()) for p in sorted(folder.glob("[0-9]" * 5 + ".json"))]
    chunks = []
    for r in results:
        audio = next(p for p in folder.glob(f"{r['seq']:05d}.*") if p.suffix != ".json")
        chunks.append(Chunk(r["seq"], r["start_ms"], r["duration_ms"], r["mime"], audio))
    return Session(
        id=session_id,
        label=meta["label"],
        vocabulary=meta["vocabulary"],
        folder=folder,
        chunks=chunks,
        results=results,
    )


def load_lecture(slug: str, corpus_dir: Path = CORPUS_DIR) -> Lecture:
    folder = corpus_dir / slug
    window = json.loads((folder / "reference-window.json").read_text())
    path = folder / "reference.txt"
    if not path.exists():
        path = folder / "reference-10min.txt"
    turns: list[tuple[str, str]] = []
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        speaker, sep, text = line.partition(":")
        label = speaker.strip().capitalize() if sep else ""
        if label in {"Student", "Instructor"}:
            turns.append((label, text.strip()))
        else:
            turns.append(("", line))
    vocabulary_file = folder / "vocabulary.txt"
    vocabulary = (
        [t.strip() for t in vocabulary_file.read_text().splitlines() if t.strip()]
        if vocabulary_file.exists()
        else []
    )
    return Lecture(
        slug=slug,
        folder=folder,
        reference=" ".join(text for _, text in turns),
        turns=turns,
        student_turns=[text for label, text in turns if label == "Student"],
        session_id=window["session"],
        start_ms=window["start_ms"],
        end_ms=window["end_ms"],
        vocabulary=vocabulary,
    )


def in_window(segments: list[Segment], start_ms: int, end_ms: int) -> list[Segment]:
    """Segments whose midpoint falls inside the window, in time order."""
    return sorted(
        (s for s in segments if start_ms <= (s.start_ms + s.end_ms) / 2 < end_ms),
        key=lambda s: (s.start_ms, s.seq),
    )
