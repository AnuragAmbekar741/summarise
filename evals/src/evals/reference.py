"""Draft a reference window from a recorded session, for hand correction.

    make eval-reference LECTURE=cs229-w3 SESSION=<id> START=12:00 END=22:00

Writes evals/corpus/<lecture>/ with the live transcript of the window as a draft,
the exact window (snapped to segment edges), the vocabulary, and window.ogg to
listen to while correcting (needs ffmpeg). Correct every line against the audio;
prefix student speech with "Student:". Starting from the draft saves time but
leans towards the live model, so correct carefully.
"""

import argparse
import json
from pathlib import Path

from evals.audio import FfmpegMissing, window_audio
from evals.corpus import CORPUS_DIR, Session, in_window, load_session
from evals.providers import live_chunks


def parse_clock(text: str) -> int:
    """`mm:ss` or `h:mm:ss` to milliseconds."""
    parts = [int(p) for p in text.split(":")]
    seconds = 0
    for p in parts:
        seconds = seconds * 60 + p
    return seconds * 1000


def draft(
    slug: str,
    session: Session,
    start_ms: int,
    end_ms: int,
    corpus_dir: Path = CORPUS_DIR,
    force: bool = False,
) -> Path:
    folder = corpus_dir / slug
    reference = folder / "reference-10min.txt"
    if reference.exists() and not force:
        raise FileExistsError(f"{reference} exists; pass --force to overwrite a corrected file")
    segments = in_window(live_chunks(session).segments, start_ms, end_ms)
    if not segments:
        raise ValueError("no transcript in that window")

    folder.mkdir(parents=True, exist_ok=True)
    window = {
        "session": session.id,
        "start_ms": segments[0].start_ms,
        "end_ms": segments[-1].end_ms,
    }
    (folder / "reference-window.json").write_text(json.dumps(window, indent=2) + "\n")
    lines = [
        (
            f"# Draft from the live transcript of {session.label!r},"
            f" {_clock(window['start_ms'])} to {_clock(window['end_ms'])}."
        ),
        "# Correct every line against window.ogg. Prefix student speech with 'Student:'.",
        "# Lines starting with # are ignored.",
        *(s.text for s in segments),
    ]
    reference.write_text("\n".join(lines) + "\n")
    vocabulary = folder / "vocabulary.txt"
    if not vocabulary.exists():
        vocabulary.write_text("".join(f"{t}\n" for t in session.vocabulary))
    return folder


def _clock(ms: int) -> str:
    s = ms // 1000
    return f"{s // 3600}:{s % 3600 // 60:02d}:{s % 60:02d}"


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--lecture", required=True, help="corpus folder name, e.g. cs229-w3")
    parser.add_argument("--session", required=True)
    parser.add_argument("--start", required=True, help="mm:ss or h:mm:ss")
    parser.add_argument("--end", required=True, help="mm:ss or h:mm:ss")
    parser.add_argument("--force", action="store_true", help="overwrite an existing reference")
    args = parser.parse_args(argv)

    session = load_session(args.session)
    folder = draft(
        args.lecture, session, parse_clock(args.start), parse_clock(args.end), force=args.force
    )
    window = json.loads((folder / "reference-window.json").read_text())
    try:
        window_audio(session.chunks, window["start_ms"], window["end_ms"], folder / "window.ogg")
        audio = "window.ogg"
    except FfmpegMissing as error:
        audio = f"no audio ({error})"
    print(
        f"Wrote {folder}: reference-10min.txt (draft), reference-window.json, vocabulary.txt, {audio}"
    )
    print("Next: correct reference-10min.txt by listening, then run make eval-transcript.")


if __name__ == "__main__":
    main()
