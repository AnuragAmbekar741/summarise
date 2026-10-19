from evals.importers import clean, oyc_turns, render, vtt_turns

OYC_HTML = """
<html><body>
<div class="element-hidden"><div id="inline_content">
  <h1 id="transcript-top">Game Theory</h1>
  <h2>ECON 159 - Lecture 1 - Introduction</h2>
  <p><h3>Chapter 1. What Is Strategy? [00:00:00]</h3>
  <p><strong>Professor Ben Polak:</strong>&nbsp;So this is Game Theory. [laughter] There is a
  syllabus--it's also online.</p>
  <p>So what is Game Theory?</p>
  <p><strong>Student:</strong> Is it on the exam? [inaudible]</p>
  <p><strong>Professor Ben Polak:</strong> Good question. [Note: The Professor said x]</p>
  </p>
</div></div>
</body></html>
"""

VTT = """WEBVTT

00:00:00.050 --> 00:00:01.770
The following content is provided

00:00:22.730 --> 00:00:23.390
PROFESSOR: Hi. Today we look

00:00:23.390 --> 00:00:25.000
at peak finding. [LAUGHTER]

00:00:25.000 --> 00:00:27.000
AUDIENCE: Why do we

00:00:27.000 --> 00:00:28.000
need that?

00:00:28.000 --> 00:00:30.000
PROFESSOR: That's exactly right.
"""


def test_clean_removes_stage_directions() -> None:
    assert clean("So [laughter] this--is\xa0it [Note: x]") == "So this is it"


def test_oyc_turns_keep_speakers_and_drop_headings() -> None:
    turns = oyc_turns(OYC_HTML)
    assert turns == [
        (
            "Instructor",
            "So this is Game Theory. There is a syllabus it's also online. So what is Game Theory?",
        ),
        ("Student", "Is it on the exam?"),
        ("Instructor", "Good question."),
    ]


def test_vtt_turns_map_speakers() -> None:
    turns = vtt_turns(VTT)
    assert turns == [
        ("Instructor", "The following content is provided"),
        ("Instructor", "Hi. Today we look at peak finding."),
        ("Student", "Why do we need that?"),
        ("Instructor", "That's exactly right."),
    ]


def test_vtt_uses_most_frequent_name_as_instructor() -> None:
    vtt = "WEBVTT\n\nPATRICK WINSTON: One.\n\nCHRIS: Two?\n\nPATRICK WINSTON: Three.\n"
    assert vtt_turns(vtt) == [("Instructor", "One."), ("", "Two?"), ("Instructor", "Three.")]


def test_render() -> None:
    assert render([("Instructor", "Hi."), ("Student", "Why?"), ("", "Other.")]) == (
        "Instructor: Hi.\nStudent: Why?\nOther.\n"
    )
