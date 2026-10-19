"""Turn published transcripts into reference turns.

A reference file has one turn per line. `Student:` marks a student turn and
`Instructor:` the lecturer; other lines are unlabelled speech. Stage directions
([laughter], [inaudible], [Note: ...]) and chapter headings are removed because
they are not words anyone said.
"""

import re
from collections import Counter

from bs4 import BeautifulSoup

STUDENT_LABELS = {"student", "students", "audience", "audience member"}

_BRACKETS = re.compile(r"\[[^\]]*\]")
_SPACES = re.compile(r"\s+")


def clean(text: str) -> str:
    text = _BRACKETS.sub(" ", text.replace("\xa0", " "))
    text = text.replace("--", " ").replace("—", " ")
    return _SPACES.sub(" ", text).strip()


def _label(speaker: str, instructor: str | None) -> str:
    name = speaker.strip().lower()
    if name in STUDENT_LABELS:
        return "Student"
    if instructor and name == instructor.lower():
        return "Instructor"
    if name.startswith("professor") or name == "professor":
        return "Instructor"
    return ""


def render(turns: list[tuple[str, str]]) -> str:
    lines = [f"{label}: {text}" if label else text for label, text in turns if text]
    return "\n".join(lines) + "\n"


def oyc_turns(html: str) -> list[tuple[str, str]]:
    """Open Yale Courses lecture page: speakers in <strong>, paragraphs continue a turn."""
    soup = BeautifulSoup(html, "html.parser")
    root = soup.find(id="inline_content")
    if root is None:
        raise ValueError("no transcript found on the page")
    for heading in root.find_all(["h1", "h2", "h3"]):
        heading.decompose()

    turns: list[tuple[str, str]] = []
    label = "Instructor"
    for paragraph in root.find_all("p"):
        if paragraph.find("p"):
            continue  # wrapper paragraph around nested ones
        strong = paragraph.find("strong")
        if strong and paragraph.get_text().lstrip().startswith(strong.get_text().strip()):
            label = _label(strong.get_text().rstrip(": \xa0"), None) or ""
            strong.decompose()
        text = clean(paragraph.get_text(" "))
        if not text:
            continue
        if turns and turns[-1][0] == label and not strong:
            turns[-1] = (label, f"{turns[-1][1]} {text}")
        else:
            turns.append((label, text))
    return turns


_CUE_TIME = re.compile(r"^\d{2}:\d{2}:\d{2}\.\d{3} --> ")
_SPEAKER = re.compile(r"^([A-Z][A-Z .'\-]{1,40}):\s*(.*)$")


def vtt_turns(vtt: str) -> list[tuple[str, str]]:
    """MIT OCW captions: `NAME:` at the start of a cue line starts a new turn.

    The most frequent named speaker is the instructor; AUDIENCE/STUDENT are students.
    """
    lines = []
    for line in vtt.splitlines():
        line = line.strip()
        if not line or line == "WEBVTT" or _CUE_TIME.match(line) or line.isdigit():
            continue
        lines.append(line)

    speakers = Counter(m.group(1) for line in lines if (m := _SPEAKER.match(line)))
    named = [s for s, _ in speakers.most_common() if s.lower() not in STUDENT_LABELS]
    instructor = named[0] if named else None

    turns: list[tuple[str, str]] = []
    label = "Instructor"
    words: list[str] = []
    for line in lines:
        match = _SPEAKER.match(line)
        if match:
            if words:
                turns.append((label, clean(" ".join(words))))
            label = _label(match.group(1), instructor)
            words = [match.group(2)]
        else:
            words.append(line)
    if words:
        turns.append((label, clean(" ".join(words))))
    return [(label, text) for label, text in turns if text]
