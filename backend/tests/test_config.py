"""Storage defaults must work in both local and read-only function bundles."""

import tempfile
from pathlib import Path

from config import load_settings


def test_vercel_sqlite_default_uses_temporary_storage(monkeypatch):
    monkeypatch.setenv("VERCEL", "1")
    monkeypatch.delenv("SQLITE_PATH", raising=False)
    assert Path(load_settings().sqlite_path) == Path(tempfile.gettempdir()) / "cardmax-demo.sqlite3"


def test_local_sqlite_default_with_blank_example_value(monkeypatch):
    monkeypatch.delenv("VERCEL", raising=False)
    monkeypatch.setenv("SQLITE_PATH", "")
    assert Path(load_settings().sqlite_path) == Path(__file__).resolve().parents[1] / "demo.sqlite3"


def test_explicit_sqlite_path_is_preserved_on_vercel(monkeypatch, tmp_path):
    monkeypatch.setenv("VERCEL", "1")
    path = str(tmp_path / "custom.sqlite3")
    monkeypatch.setenv("SQLITE_PATH", path)
    assert load_settings().sqlite_path == path
