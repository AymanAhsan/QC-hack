"""Shared backend configuration, read once from the environment (and backend/.env)."""

from __future__ import annotations

import os
import tempfile
from dataclasses import dataclass
from pathlib import Path

try:
    from dotenv import load_dotenv

    load_dotenv(Path(__file__).with_name(".env"))
except ImportError:  # python-dotenv is optional at runtime
    pass


def _bool(name: str, default: bool) -> bool:
    value = os.getenv(name)
    if value is None or value == "":
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _int(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, ""))
    except ValueError:
        return default


@dataclass(frozen=True)
class Settings:
    # CORS: comma-separated origins allowed to call the API from a browser.
    cors_origins: tuple[str, ...]
    # Gemini (owned by gemini.py). The key never leaves the backend.
    gemini_api_key: str | None
    gemini_model: str
    gemini_timeout_s: float
    max_upload_bytes: int
    # Database (owned by db.py). Empty DATABASE_URL means local SQLite.
    database_url: str | None
    sqlite_path: str
    allow_sqlite_fallback: bool
    seed_demo_data: bool

    @property
    def gemini_configured(self) -> bool:
        return bool(self.gemini_api_key)


def load_settings() -> Settings:
    origins = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
    # Function bundles are read-only. SQLite on Vercel is an ephemeral demo
    # fallback; configure DATABASE_URL for shared, durable storage.
    sqlite_default = (
        Path(tempfile.gettempdir()) / "cardmax-demo.sqlite3"
        if _bool("VERCEL", False)
        else Path(__file__).with_name("demo.sqlite3")
    )
    return Settings(
        cors_origins=tuple(o.strip() for o in origins.split(",") if o.strip()),
        gemini_api_key=os.getenv("GEMINI_API_KEY") or None,
        gemini_model=os.getenv("GEMINI_MODEL", "gemini-2.5-flash"),
        gemini_timeout_s=float(os.getenv("GEMINI_TIMEOUT_S", "20")),
        max_upload_bytes=_int("MAX_UPLOAD_BYTES", 5 * 1024 * 1024),
        database_url=os.getenv("DATABASE_URL") or None,
        sqlite_path=os.getenv("SQLITE_PATH") or str(sqlite_default),
        allow_sqlite_fallback=_bool("ALLOW_SQLITE_FALLBACK", False),
        seed_demo_data=_bool("SEED_DEMO_DATA", True),
    )


settings = load_settings()
