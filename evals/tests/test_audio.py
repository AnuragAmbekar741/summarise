import shutil
import subprocess
from pathlib import Path

import pytest

from evals.audio import BYTES_PER_MS, assemble, lecture_parts, wav_seconds
from evals.corpus import Chunk


def pcm(ms: int, value: int = 1) -> bytes:
    return bytes([value]) * (ms * BYTES_PER_MS)


def test_assemble_fills_gaps_with_silence() -> None:
    out = assemble([(0, pcm(10)), (30, pcm(10, 2))])
    assert len(out) == 40 * BYTES_PER_MS
    assert out[10 * BYTES_PER_MS : 30 * BYTES_PER_MS] == b"\x00" * (20 * BYTES_PER_MS)
    assert out[30 * BYTES_PER_MS :] == pcm(10, 2)


def test_assemble_trims_overlap_and_sorts() -> None:
    out = assemble([(8, pcm(10, 2)), (0, pcm(10, 1))])
    assert len(out) == 18 * BYTES_PER_MS
    assert out[: 10 * BYTES_PER_MS] == pcm(10, 1)
    assert out[10 * BYTES_PER_MS :] == pcm(8, 2)


@pytest.mark.skipif(shutil.which("ffmpeg") is None, reason="ffmpeg not installed")
def test_lecture_parts_keep_lecture_time(tmp_path: Path) -> None:
    def tone(name: str, seconds: int) -> Path:
        path = tmp_path / name
        subprocess.run(
            ["ffmpeg", "-v", "error", "-f", "lavfi", "-i", f"sine=frequency=440:duration={seconds}",
             "-c:a", "libopus", str(path)],
            check=True,
        )  # fmt: skip
        return path

    chunks = [
        Chunk(4, 600_000, 3_000, "audio/ogg", tone("a.ogg", 3)),  # starts 10 min in
        Chunk(6, 605_000, 2_000, "audio/ogg", tone("b.ogg", 2)),  # 2 s silent gap before
    ]
    parts = lecture_parts(chunks, tmp_path / "work", part_seconds=4)

    # Audio starts at the first chunk, not at 0:00, and offsets stay on the lecture clock.
    assert [offset for _, offset in parts] == [600_000, 604_000]
    assert wav_seconds(tmp_path / "work" / "lecture.wav") == pytest.approx(7.0, abs=0.05)
