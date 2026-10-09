"""FastAPI app: router registration, CORS, error envelope, health. Owner: Omar.

Feature code lives in routers/<area>.py. To add an endpoint, add it to the
owning router module; only touch this file to register a new router.
"""

from __future__ import annotations

import importlib
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from errors import install_error_handlers
from routers import cart, deals, missed, recommend, stack, transactions, wallet
from schemas import HealthResponse

VERSION = "0.1.0"
log = logging.getLogger("uvicorn.error")


def _db_module():
    """db.py (owned by Ayman) is optional until persistence lands.

    Expected interface: init() -> None (connect, migrate, seed) and mode() -> str
    ("timescale", "postgres", or "sqlite").
    """
    try:
        return importlib.import_module("db")
    except ModuleNotFoundError as exc:
        if exc.name != "db":
            raise
        return None


@asynccontextmanager
async def lifespan(_: FastAPI):
    db = _db_module()
    if db is not None and hasattr(db, "init"):
        db.init()
        log.info("Database mode: %s", db.mode())
    else:
        log.warning("db.py not present: transactions and missed history are unavailable")
    yield


app = FastAPI(title="Credit Card Optimizer (demo)", version=VERSION, lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.cors_origins),
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)
install_error_handlers(app)

for module in (wallet, recommend, stack, deals, transactions, missed, cart):
    app.include_router(module.router)


@app.get("/api/health", response_model=HealthResponse, tags=["health"])
def health() -> HealthResponse:
    db = _db_module()
    db_mode = db.mode() if db is not None and hasattr(db, "mode") else "not_configured"
    return HealthResponse(status="ok", db_mode=db_mode, gemini_configured=settings.gemini_configured, version=VERSION)
