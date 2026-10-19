"""Download the public lecture corpus and build its references.

    make corpus                      # every lecture in evals/corpus/manifest.json
    make corpus ARGS="--only oyc-econ159-l1"

For each lecture: source audio (mp3/mp4), the published transcript converted to
reference.txt (one turn per line, `Student:` marked), and vocabulary.txt: the
rarest words the lecturer repeats, standing in for the course terms a student
would type before class. Existing files are kept unless --force.
"""

import argparse
import json
import re
from collections import Counter
from pathlib import Path

import httpx
from wordfreq import zipf_frequency

from evals.corpus import CORPUS_DIR
from evals.importers import oyc_turns, render, vtt_turns

VOCABULARY_SIZE = 15
MAX_ZIPF = 3.2  # rarer than about 1 in 600,000 English words
MIN_COUNT = 2


def manifest(corpus_dir: Path = CORPUS_DIR) -> dict:
    return json.loads((corpus_dir / "manifest.json").read_text())


def vocabulary(turns: list[tuple[str, str]], size: int = VOCABULARY_SIZE) -> list[str]:
    """Rare words said at least twice, most frequent first; numbers and short words skipped."""
    counts: Counter[str] = Counter()
    for _, text in turns:
        for word in re.findall(r"[A-Za-z][A-Za-z'’\-]+", text):
            if "'" not in word and "’" not in word:  # contractions are not course terms
                counts[word.lower()] += 1
    rare = [
        (count, word)
        for word, count in counts.items()
        if count >= MIN_COUNT and len(word) >= 4 and zipf_frequency(word, "en") <= MAX_ZIPF
    ]
    return [word for _, word in sorted(rare, key=lambda cw: (-cw[0], cw[1]))[:size]]


def download(url: str, out: Path, client: httpx.Client) -> None:
    tmp = out.with_suffix(out.suffix + ".part")
    with client.stream("GET", url) as response:
        response.raise_for_status()
        with tmp.open("wb") as f:
            for block in response.iter_bytes(1 << 20):
                f.write(block)
    tmp.replace(out)


def fetch(lecture: dict, corpus_dir: Path, client: httpx.Client, force: bool = False) -> Path:
    folder = corpus_dir / lecture["slug"]
    folder.mkdir(parents=True, exist_ok=True)
    (folder / "lecture.json").write_text(json.dumps(lecture, indent=2) + "\n")

    suffix = Path(lecture["audio"]).suffix
    audio = folder / f"source{suffix}"
    if not audio.exists():  # delete the file to download it again
        print(f"  audio {lecture['audio']}")
        download(lecture["audio"], audio, client)

    reference = folder / "reference.txt"
    if force or not reference.exists():
        if lecture["source"] == "oyc":
            turns = oyc_turns(client.get(lecture["page"]).raise_for_status().text)
        else:
            turns = vtt_turns(client.get(lecture["captions"]).raise_for_status().text)
        reference.write_text(render(turns))
        (folder / "vocabulary.txt").write_text("".join(f"{t}\n" for t in vocabulary(turns)))
    return folder


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--only", help="comma-separated slugs")
    parser.add_argument("--force", action="store_true", help="rebuild references and vocabulary")
    args = parser.parse_args(argv)

    wanted = set(args.only.split(",")) if args.only else None
    lectures = [l for l in manifest()["lectures"] if not wanted or l["slug"] in wanted]
    headers = {"user-agent": "summarise-evals/0.1 (private evaluation)"}
    with httpx.Client(follow_redirects=True, timeout=120, headers=headers) as client:
        for lecture in lectures:
            print(lecture["slug"])
            folder = fetch(lecture, CORPUS_DIR, client, args.force)
            size = sum(p.stat().st_size for p in folder.iterdir()) / 1e6
            print(f"  ok, {size:.0f} MB")


if __name__ == "__main__":
    main()
