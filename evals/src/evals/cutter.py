"""Python port of apps/web/src/capture/silence-cutter.ts, so offline simulation cuts
recordings where the browser would. Keep the two in step: same defaults, same rules,
same test cases (silence-cutter.test.ts and test_cutter.py).
"""

from dataclasses import dataclass
from typing import Literal

Decision = Literal["continue", "cut", "force_cut"]


@dataclass(frozen=True)
class CutterConfig:
    min_chunk_ms: int = 25_000
    max_chunk_ms: int = 45_000
    silence_window_ms: int = 300
    floor_window_ms: int = 30_000
    floor_percentile: float = 0.1
    margin_db: float = 6
    speech_percentile: float = 0.9
    min_contrast_db: float = 10
    max_contrast_db: float = 35
    speech_decay_db_per_sec: float = 1 / 30
    silent_share: float = 0.95


@dataclass(frozen=True)
class ChunkStats:
    start_ms: int
    samples: int
    silent_samples: int
    silent: bool


class SilenceCutter:
    def __init__(self, config: CutterConfig | None = None) -> None:
        self.config = config or CutterConfig()
        self._history: list[tuple[int, float]] = []
        self._chunk_start = 0
        self._samples = 0
        self._silent_samples = 0
        self._silence_since: int | None = None
        self._floor = -100.0
        self._speech = -100.0
        self._last_t: int | None = None

    @property
    def floor_db(self) -> float:
        return self._floor

    @property
    def threshold_db(self) -> float:
        c = self.config
        from_floor = max(self._floor + c.margin_db, self._speech - c.max_contrast_db)
        return min(from_floor, self._speech - c.min_contrast_db)

    def start_chunk(self, t: int) -> None:
        self._chunk_start = t
        self._samples = 0
        self._silent_samples = 0
        self._silence_since = None

    def stats(self) -> ChunkStats:
        share = self._silent_samples / self._samples if self._samples else 1
        return ChunkStats(
            start_ms=self._chunk_start,
            samples=self._samples,
            silent_samples=self._silent_samples,
            silent=share >= self.config.silent_share,
        )

    def push(self, t: int, db: float) -> Decision:
        self._remember(t, db)

        if db < self.threshold_db:
            self._silent_samples += 1
            if self._silence_since is None:
                self._silence_since = t
        else:
            self._silence_since = None
        self._samples += 1

        age = t - self._chunk_start
        if age >= self.config.max_chunk_ms:
            return "force_cut"
        if (
            age >= self.config.min_chunk_ms
            and self._silence_since is not None
            and t - self._silence_since >= self.config.silence_window_ms
        ):
            return "cut"
        return "continue"

    def _remember(self, t: int, db: float) -> None:
        self._history.append((t, db))
        oldest = t - self.config.floor_window_ms
        drop = 0
        while drop < len(self._history) and self._history[drop][0] < oldest:
            drop += 1
        if drop:
            del self._history[:drop]

        levels = sorted(level for _, level in self._history)

        def at(p: float) -> float:
            return levels[int((len(levels) - 1) * p)]

        self._floor = at(self.config.floor_percentile)
        elapsed = 0.0 if self._last_t is None else (t - self._last_t) / 1000
        decayed = self._speech - self.config.speech_decay_db_per_sec * elapsed
        self._speech = max(at(self.config.speech_percentile), decayed)
        self._last_t = t
