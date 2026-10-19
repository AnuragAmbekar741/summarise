from collections.abc import Sequence


def percentile(values: Sequence[float], p: float) -> float | None:
    """Nearest-rank percentile, matching the web app's debug panel. None for no values."""
    if not values:
        return None
    ordered = sorted(values)
    rank = max(1, -(-len(ordered) * p // 1))  # ceil without math import
    return ordered[int(rank) - 1]
