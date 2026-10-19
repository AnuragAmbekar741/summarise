"""Stage 0 storage: one folder per session under DATA_DIR/sessions.

    <id>/meta.json          label, vocabulary, created_at
    <id>/00001.webm         chunk audio, written before transcription
    <id>/00001.json         ChunkResult, written after transcription
    <id>/chunks.jsonl       one ChunkResult per line, in arrival order (for the eval)

Replaced by R2 and Postgres in stage 2.
"""

import json
import re
import threading
import time
import uuid
from pathlib import Path
from typing import Any

from api.modules.proof.schemas import ChunkResult

_SESSION_ID = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$")

EXTENSIONS = {
    "audio/webm": "webm",
    "audio/ogg": "ogg",
    "audio/mp4": "m4a",
    "audio/x-m4a": "m4a",
    "audio/mpeg": "mp3",
    "audio/wav": "wav",
    "audio/x-wav": "wav",
}


class SessionNotFound(LookupError):
    pass


def extension_for(mime: str) -> str | None:
    """`audio/webm;codecs=opus` -> `webm`; None when unsupported."""
    return EXTENSIONS.get(mime.split(";")[0].strip().lower())


class SessionStore:
    def __init__(self, root: Path) -> None:
        self.root = root / "sessions"
        self._lock = threading.Lock()

    def create(self, label: str, vocabulary: list[str]) -> str:
        session_id = str(uuid.uuid7())
        folder = self.root / session_id
        folder.mkdir(parents=True)
        meta = {
            "id": session_id,
            "label": label,
            "vocabulary": vocabulary,
            "created_at": time.time(),
        }
        _write_json(folder / "meta.json", meta)
        return session_id

    def meta(self, session_id: str) -> dict[str, Any]:
        path = self._folder(session_id) / "meta.json"
        return json.loads(path.read_text())

    def save_audio(self, session_id: str, seq: int, ext: str, data: bytes) -> Path:
        path = self._folder(session_id) / f"{seq:05d}.{ext}"
        path.write_bytes(data)
        return path

    def result(self, session_id: str, seq: int) -> ChunkResult | None:
        path = self._folder(session_id) / f"{seq:05d}.json"
        if not path.exists():
            return None
        return ChunkResult.model_validate_json(path.read_text())

    def save_result(self, session_id: str, result: ChunkResult) -> None:
        folder = self._folder(session_id)
        payload = result.model_dump_json()
        tmp = folder / f"{result.seq:05d}.json.tmp"
        tmp.write_text(payload)
        tmp.replace(folder / f"{result.seq:05d}.json")
        with self._lock, (folder / "chunks.jsonl").open("a") as log:
            log.write(payload + "\n")

    def latest_result_before(self, session_id: str, seq: int) -> ChunkResult | None:
        """The stored result with the highest seq below `seq`, reading one file."""
        folder = self._folder(session_id)
        names = sorted(p.name for p in folder.glob("[0-9][0-9][0-9][0-9][0-9].json"))
        earlier = [n for n in names if int(n[:5]) < seq]
        if not earlier:
            return None
        return ChunkResult.model_validate_json((folder / earlier[-1]).read_text())

    def results(self, session_id: str) -> list[ChunkResult]:
        folder = self._folder(session_id)
        return [
            ChunkResult.model_validate_json(p.read_text())
            for p in sorted(folder.glob("[0-9][0-9][0-9][0-9][0-9].json"))
        ]

    def _folder(self, session_id: str) -> Path:
        if not _SESSION_ID.match(session_id):
            raise SessionNotFound(session_id)
        folder = self.root / session_id
        if not (folder / "meta.json").exists():
            raise SessionNotFound(session_id)
        return folder


def _write_json(path: Path, data: dict[str, Any]) -> None:
    path.write_text(json.dumps(data, indent=2))
