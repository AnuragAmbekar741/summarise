"""Run a recorded lecture through the capture pipeline offline.

    make simulate                    # every lecture in the corpus
    make simulate ARGS="--only oyc-econ159-l1"

Levels every 50 ms (ffmpeg) feed the Python port of the browser's silence
cutter, so chunks are cut where the app would cut them. Cut statistics cover the
whole lecture and cost nothing. Only chunks around the scoring window are
encoded (Opus, 32 kbps, as the browser records) and sent through the API's own
`transcribe_chunk`, in order, so prompts chain exactly as they do live.
Groq allows 2 audio-hours per hour and 8 per day per model, which is why only
the window is transcribed.
"""

import argparse
import hashlib
import json
import re
import subprocess
import time
from dataclasses import asdict, dataclass
from pathlib import Path

from api.modules.proof.service import ChunkUpload, TranscriptionFailed, transcribe_chunk
from api.modules.proof.storage import SessionStore
from evals.audio import BYTES_PER_MS, decode, ffmpeg
from evals.corpus import CORPUS_DIR, DATA_DIR
from evals.cutter import CutterConfig, SilenceCutter
from evals.fetch import manifest
from evals.keys import key
from evals.metrics import percentile
from speech import groq

STEP_MS = 50
LEAD_MS = 60_000  # transcribe from a minute before the window, to seed the prompt chain
MIME = "audio/webm;codecs=opus"
RETRY_SECONDS = 60
MAX_RETRIES = 90  # Groq's hourly audio cap can need most of an hour to clear


@dataclass(frozen=True)
class PlannedChunk:
    seq: int
    start_ms: int
    end_ms: int
    reason: str
    silent: bool


def levels(path: Path) -> list[float]:
    """dBFS of every 50 ms of audio (800 samples at 16 kHz)."""
    window = 16_000 * STEP_MS // 1000
    result = subprocess.run(
        [ffmpeg(), "-v", "error", "-i", str(path), "-ac", "1", "-af",
         (f"aresample=16000,asetnsamples=n={window}:p=0,"
          "astats=metadata=1:reset=1:measure_overall=RMS_level:measure_perchannel=none,"
          "ametadata=print:key=lavfi.astats.Overall.RMS_level:file=-"),
         "-f", "null", "-"],
        check=True, capture_output=True, text=True,
    )  # fmt: skip
    values = re.findall(r"RMS_level=(-?inf|-?[\d.]+)", result.stdout)
    return [-100.0 if v.endswith("inf") else max(-100.0, float(v)) for v in values]


def plan_chunks(dbs: list[float], config: CutterConfig | None = None) -> list[PlannedChunk]:
    """Where the browser would cut, from levels alone."""
    cutter = SilenceCutter(config)
    cutter.start_chunk(0)
    chunks: list[PlannedChunk] = []
    start = 0
    for i, db in enumerate(dbs):
        t = i * STEP_MS
        decision = cutter.push(t, db)
        if decision == "continue":
            continue
        reason = "force" if decision == "force_cut" else "silence"
        chunks.append(PlannedChunk(len(chunks) + 1, start, t, reason, cutter.stats().silent))
        cutter.start_chunk(t)
        start = t
    end = len(dbs) * STEP_MS
    if end > start:
        chunks.append(PlannedChunk(len(chunks) + 1, start, end, "stop", cutter.stats().silent))
    return chunks


def cut_stats(chunks: list[PlannedChunk]) -> dict:
    lengths = [(c.end_ms - c.start_ms) / 1000 for c in chunks if not c.silent]
    in_speech = [c for c in chunks if c.reason in ("silence", "force")]
    forced = sum(c.reason == "force" for c in in_speech)
    return {
        "chunks": len(chunks),
        "silent": sum(c.silent for c in chunks),
        "silence_cuts": sum(c.reason == "silence" for c in chunks),
        "force_cuts": forced,
        "force_cut_share": round(forced / len(in_speech), 4) if in_speech else None,
        "chunk_seconds_p50": percentile(lengths, 0.5),
        "chunk_seconds_p95": percentile(lengths, 0.95),
        "chunk_seconds_min": min(lengths) if lengths else None,
    }


def encode(pcm: bytes) -> bytes:
    result = subprocess.run(
        [ffmpeg(), "-v", "error", "-f", "s16le", "-ar", "16000", "-ac", "1", "-i", "pipe:0",
         "-c:a", "libopus", "-b:a", "32k", "-f", "webm", "pipe:1"],
        input=pcm, check=True, capture_output=True,
    )  # fmt: skip
    return result.stdout


def simulate(slug: str, window: tuple[int, int], corpus_dir: Path, data_dir: Path) -> dict:
    folder = corpus_dir / slug
    source = next(folder.glob("source.*"))
    chunks = plan_chunks(levels(source))
    stats = cut_stats(chunks)

    window_file = folder / "reference-window.json"
    store = SessionStore(data_dir)
    if window_file.exists():
        session_id = json.loads(window_file.read_text())["session"]
    else:
        vocabulary = (folder / "vocabulary.txt").read_text().split()
        session_id = store.create(slug, vocabulary)

    client = groq.make_client(key("GROQ_API_KEY"))

    def transcriber(path: Path, mime: str, prompt: str):
        return groq.transcribe(path, client=client, model=groq.TURBO, mime=mime, prompt=prompt)

    start_ms, end_ms = window
    wanted = [
        c for c in chunks
        if not c.silent and c.end_ms > start_ms - LEAD_MS and c.start_ms < end_ms
    ]  # fmt: skip
    pcm = decode(source)
    for chunk in wanted:
        data = encode(pcm[chunk.start_ms * BYTES_PER_MS : chunk.end_ms * BYTES_PER_MS])
        upload = ChunkUpload(
            seq=chunk.seq,
            start_ms=chunk.start_ms,
            duration_ms=chunk.end_ms - chunk.start_ms,
            sha256=hashlib.sha256(data).hexdigest(),
            mime=MIME,
            data=data,
        )
        _with_retries(
            lambda upload=upload: transcribe_chunk(store, transcriber, session_id, upload),
            chunk.seq,
        )
        print(
            f"  chunk {chunk.seq} ({chunk.reason}, {upload.duration_ms / 1000:.1f} s) ok",
            flush=True,
        )

    window_file.write_text(
        json.dumps({"session": session_id, "start_ms": start_ms, "end_ms": end_ms}, indent=2) + "\n"
    )
    report = {
        "slug": slug,
        "session": session_id,
        "duration_ms": len(pcm) // BYTES_PER_MS,
        "uploaded": len(wanted),
        "cuts": stats,
        "chunks": [asdict(c) for c in chunks],
    }
    (folder / "simulation.json").write_text(json.dumps(report, indent=1) + "\n")
    return report


def _with_retries(call, seq: int) -> None:
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            call()
            return
        except TranscriptionFailed as error:
            if attempt == MAX_RETRIES:
                raise
            print(f"  chunk {seq}: {error}; retry {attempt} in {RETRY_SECONDS} s", flush=True)
            time.sleep(RETRY_SECONDS)


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--only", help="comma-separated slugs")
    args = parser.parse_args(argv)

    corpus = manifest()
    window = tuple(corpus["window_ms"])
    wanted = set(args.only.split(",")) if args.only else None
    for lecture in corpus["lectures"]:
        if wanted and lecture["slug"] not in wanted:
            continue
        print(lecture["slug"], flush=True)
        report = simulate(lecture["slug"], window, CORPUS_DIR, DATA_DIR)
        cuts = report["cuts"]
        print(
            f"  {cuts['chunks']} chunks over {report['duration_ms'] / 60_000:.1f} min,"
            f" {cuts['silence_cuts']} silence / {cuts['force_cuts']} forced cuts,"
            f" {cuts['silent']} silent; {report['uploaded']} uploaded",
            flush=True,
        )


if __name__ == "__main__":
    main()
