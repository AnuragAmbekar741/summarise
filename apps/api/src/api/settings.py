from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# Repo root: apps/api/src/api/settings.py -> parents[4]
ROOT = Path(__file__).resolve().parents[4]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=ROOT / ".env", extra="ignore")

    groq_api_key: str = ""
    data_dir: Path = ROOT / ".data"
    web_origin: str = "http://localhost:5173"


@lru_cache
def get_settings() -> Settings:
    return Settings()
