"""Same cases as apps/web/src/capture/silence-cutter.test.ts."""

from collections.abc import Callable

from evals.cutter import SilenceCutter

STEP = 50
SPEECH = -20.0
QUIET = -55.0


def feed(cutter: SilenceCutter, start: int, end: int, level: Callable[[int], float]):
    decisions = []
    for t in range(start, end, STEP):
        decision = cutter.push(t, level(t))
        if decision != "continue":
            decisions.append((t, decision))
            cutter.start_chunk(t)
    return decisions


def speech_with_pauses(pauses: list[tuple[int, int]]) -> Callable[[int], float]:
    def level(t: int) -> float:
        if any(a <= t < b for a, b in pauses):
            return QUIET
        return SPEECH if t % 1000 < 850 else QUIET

    return level


def new() -> SilenceCutter:
    cutter = SilenceCutter()
    cutter.start_chunk(0)
    return cutter


def test_cuts_at_first_long_pause_after_25_s() -> None:
    decisions = feed(new(), 0, 40_000, speech_with_pauses([(27_000, 28_000)]))
    assert len(decisions) == 1
    t, decision = decisions[0]
    assert decision == "cut"
    assert 27_000 <= t < 28_000


def test_ignores_pauses_before_25_s() -> None:
    assert feed(new(), 0, 30_000, speech_with_pauses([(10_000, 12_000)])) == []


def test_does_not_cut_on_gaps_between_words() -> None:
    assert feed(new(), 0, 44_000, speech_with_pauses([])) == []


def test_force_cuts_continuous_speech_at_45_s() -> None:
    assert feed(new(), 0, 50_000, lambda t: SPEECH) == [(45_000, "force_cut")]


def test_marks_silence_after_speech_as_silent() -> None:
    cutter = new()
    feed(cutter, 0, 60_000, speech_with_pauses([]))
    cutter.start_chunk(60_000)
    feed(cutter, 60_000, 104_000, lambda t: QUIET)
    assert cutter.stats().silent


def test_still_silent_ten_minutes_into_a_break() -> None:
    cutter = new()
    feed(cutter, 0, 60_000, speech_with_pauses([]))
    decisions = feed(cutter, 60_000, 660_000, lambda t: QUIET)
    assert len(decisions) > 10
    assert cutter.stats().silent


def test_uploads_silence_before_any_speech() -> None:
    cutter = new()
    feed(cutter, 0, 20_000, lambda t: QUIET)
    assert not cutter.stats().silent


def test_speech_chunk_is_not_silent() -> None:
    cutter = new()
    feed(cutter, 0, 20_000, speech_with_pauses([]))
    assert not cutter.stats().silent


def test_floor_follows_rising_noise() -> None:
    def noise(t: int) -> float:
        return QUIET + 15 * min(t, 60_000) / 60_000

    def level(t: int) -> float:
        if 27_000 <= t % 30_000 < 28_000:
            return noise(t)
        return SPEECH if t % 1000 < 850 else noise(t)

    cutter = new()
    decisions = feed(cutter, 0, 120_000, level)
    assert len(decisions) >= 3
    assert all(d == "cut" for _, d in decisions)
    assert cutter.floor_db > -45


def test_digital_silence_does_not_sink_threshold() -> None:
    def level(t: int) -> float:
        if t < 5_000:
            return -100
        if 31_000 <= t < 31_500:
            return -60
        return SPEECH if t % 1000 < 850 else -100

    cutter = new()
    decisions = feed(cutter, 0, 40_000, level)
    assert len(decisions) == 1 and decisions[0][1] == "cut"
    assert cutter.threshold_db > -60


def test_chunk_stats_reset_per_chunk() -> None:
    cutter = new()
    feed(cutter, 0, 1_000, lambda t: SPEECH)
    cutter.start_chunk(1_000)
    assert cutter.stats().start_ms == 1_000
    assert cutter.stats().samples == 0
