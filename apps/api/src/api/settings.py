from functools import lru_cache
from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Repo root: apps/api/src/api/settings.py -> parents[4]
ROOT = Path(__file__).resolve().parents[4]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=ROOT / ".env", extra="ignore")

    groq_api_key: str = ""
    groq_model: str = "whisper-large-v3-turbo"
    data_dir: Path = ROOT / ".data"
    web_origin: str = "http://localhost:5173"

    @field_validator("data_dir")
    @classmethod
    def _from_repo_root(cls, value: Path) -> Path:
        # `make api` runs from apps/api; a relative DATA_DIR means the repo root.
        return value if value.is_absolute() else ROOT / value


@lru_cache
def get_settings() -> Settings:
    return Settings()
