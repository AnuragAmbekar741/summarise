import itertools
import json
import shutil
import subprocess
from pathlib import Path

import pytest

from api.modules.proof.storage import SessionStore
from evals.simulate import STEP_MS, cut_stats, encode, existing_session, levels, plan_chunks

SPEECH, QUIET = -20.0, -55.0


def speech(seconds: int, pause_every: int = 0) -> list[float]:
    """50 ms levels: words with short gaps, optional 1 s pauses every `pause_every` seconds."""
    out = []
    for i in range(seconds * 1000 // STEP_MS):
        t = i * STEP_MS
        if pause_every and t % (pause_every * 1000) >= pause_every * 1000 - 1000:
            out.append(QUIET)
        else:
            out.append(SPEECH if t % 1000 < 850 else QUIET)
    return out


def test_plan_chunks_cuts_at_pauses_and_ends_with_stop() -> None:
    chunks = plan_chunks(speech(100, pause_every=30))
    assert [c.reason for c in chunks] == ["silence", "silence", "silence", "stop"]
    assert chunks[0].start_ms == 0
    assert all(a.end_ms == b.start_ms for a, b in itertools.pairwise(chunks))
    assert chunks[-1].end_ms == 100_000
    assert [c.seq for c in chunks] == [1, 2, 3, 4]


def test_plan_chunks_marks_a_break_silent() -> None:
    chunks = plan_chunks(speech(60) + [QUIET] * (60 * 1000 // STEP_MS))
    assert any(c.silent for c in chunks)
    assert not chunks[0].silent


def test_cut_stats() -> None:
    stats = cut_stats(plan_chunks(speech(140)))  # nonstop speech: forced every 45 s
    assert stats["force_cuts"] == 3
    assert stats["force_cut_share"] == 1.0
    assert stats["chunk_seconds_p50"] == 45.0


@pytest.mark.skipif(shutil.which("ffmpeg") is None, reason="ffmpeg not installed")
def test_levels_and_encode_with_ffmpeg(tmp_path: Path) -> None:
    tone = tmp_path / "tone.wav"
    subprocess.run(
        ["ffmpeg", "-v", "error", "-f", "lavfi", "-i", "sine=frequency=440:duration=2",
         "-af", "volume=0.5", str(tone)],
        check=True,
    )  # fmt: skip
    dbs = levels(tone)
    assert len(dbs) == 40  # 2 s of 50 ms windows
    # lavfi sine has amplitude 1/8; at half volume its RMS is 0.125 / sqrt(2) / 2 = -27.1 dBFS
    assert all(-28 < db < -26 for db in dbs[1:-1])

    webm = encode(b"\x00\x01" * 16_000)  # 1 s of near-silence
    assert webm[:4] == b"\x1a\x45\xdf\xa3"  # WebM/Matroska header


def test_existing_session_needs_its_data_folder(tmp_path: Path) -> None:
    store = SessionStore(tmp_path / "data")
    window = tmp_path / "reference-window.json"
    assert existing_session(window, store) is None

    live = store.create("lec", [])
    window.write_text(json.dumps({"session": live, "start_ms": 0, "end_ms": 1}))
    assert existing_session(window, store) == live

    window.write_text(
        json.dumps({"session": "01a10000-0000-7000-8000-000000000000", "start_ms": 0, "end_ms": 1})
    )
    assert existing_session(window, store) is None
