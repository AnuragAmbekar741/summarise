"""Rebuild a session's audio on the lecture clock, for full-file transcription.

Chunks are decoded to 16 kHz mono PCM and placed at their `start_ms`: gaps
(silent chunks that were never uploaded) become silence, and the few ms where
consecutive recorders overlapped are trimmed, so file time equals lecture time.
Requires ffmpeg.
"""

import shutil
import subprocess
import wave
from collections.abc import Iterable
from pathlib import Path

from evals.corpus import Chunk

SAMPLE_RATE = 16_000
BYTES_PER_MS = SAMPLE_RATE * 2 // 1000  # 16-bit mono
PART_SECONDS = 50 * 60  # 50 min of 32 kbps Opus is about 12 MB, under Groq's 25 MB


class FfmpegMissing(RuntimeError):
    pass


def ffmpeg() -> str:
    path = shutil.which("ffmpeg")
    if not path:
        raise FfmpegMissing("ffmpeg not found; install it with `brew install ffmpeg`")
    return path


def assemble(pieces: Iterable[tuple[int, bytes]]) -> bytes:
    """Place PCM pieces (start_ms, 16 kHz mono s16le) on one timeline."""
    out = bytearray()
    for start_ms, pcm in sorted(pieces, key=lambda p: p[0]):
        target = start_ms * BYTES_PER_MS
        if target > len(out):
            out.extend(b"\x00" * (target - len(out)))
        elif target < len(out):
            pcm = pcm[len(out) - target :]  # recorder overlap: keep what is already placed
        out.extend(pcm)
    return bytes(out)


def decode(path: Path) -> bytes:
    result = subprocess.run(
        [ffmpeg(), "-v", "error", "-i", str(path), "-ac", "1", "-ar", str(SAMPLE_RATE),
         "-f", "s16le", "-"],
        check=True,
        capture_output=True,
    )  # fmt: skip
    return result.stdout


def lecture_wav(chunks: list[Chunk], out: Path) -> Path:
    pcm = assemble((c.start_ms, decode(c.path)) for c in chunks)
    with wave.open(str(out), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SAMPLE_RATE)
        w.writeframes(pcm)
    return out


def encode_opus(wav: Path, out: Path, start_s: float = 0, duration_s: float | None = None) -> Path:
    command = [ffmpeg(), "-v", "error", "-y", "-ss", f"{start_s:.3f}", "-i", str(wav)]
    if duration_s is not None:
        command += ["-t", f"{duration_s:.3f}"]
    command += ["-ac", "1", "-c:a", "libopus", "-b:a", "32k", str(out)]
    subprocess.run(command, check=True, capture_output=True)
    return out


def wav_seconds(wav: Path) -> float:
    with wave.open(str(wav)) as w:
        return w.getnframes() / w.getframerate()


def lecture_parts(
    chunks: list[Chunk], work_dir: Path, part_seconds: int = PART_SECONDS
) -> list[tuple[Path, int]]:
    """The lecture as Opus files of at most `part_seconds`, each with its offset in ms."""
    work_dir.mkdir(parents=True, exist_ok=True)
    wav = lecture_wav(chunks, work_dir / "lecture.wav")
    total = wav_seconds(wav)
    parts = []
    start = 0.0
    index = 1
    while start < total:
        path = encode_opus(wav, work_dir / f"part-{index:02d}.ogg", start, part_seconds)
        parts.append((path, round(start * 1000)))
        start += part_seconds
        index += 1
    return parts


def window_audio(chunks: list[Chunk], start_ms: int, end_ms: int, out: Path) -> Path:
    """The reference window as one Opus file, to listen to while correcting."""
    wav = lecture_wav(chunks, out.with_suffix(".wav"))
    try:
        return encode_opus(wav, out, start_ms / 1000, (end_ms - start_ms) / 1000)
    finally:
        wav.unlink()
