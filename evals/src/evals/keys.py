import os

from evals.corpus import ROOT


class MissingKey(RuntimeError):
    pass


def key(name: str) -> str:
    """An API key from the environment or the repo's .env file."""
    if os.environ.get(name):
        return os.environ[name]
    env = ROOT / ".env"
    if env.exists():
        for line in env.read_text().splitlines():
            k, _, v = line.partition("=")
            if k.strip() == name and v.strip():
                return v.strip()
    raise MissingKey(f"{name} is not set in the environment or .env")
