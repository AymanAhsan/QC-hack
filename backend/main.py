"""FastAPI app: router registration, CORS, error envelope, health. Owner: Omar.

Feature code lives in routers/<area>.py. To add an endpoint, add it to the
owning router module; only touch this file to register a new router.
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.concurrency import run_in_threadpool

import db
from config import settings
from errors import install_error_handlers
from routers import cart, deals, missed, recommend, stack, transactions, wallet
from schemas import HealthResponse

VERSION = "0.1.0"
log = logging.getLogger("uvicorn.error")


@asynccontextmanager
async def lifespan(_: FastAPI):
    # Fails startup if Tiger Data is configured but unreachable and
    # ALLOW_SQLITE_FALLBACK is not set (see db.py).
    await run_in_threadpool(db.init)
    log.info("Database mode: %s", db.mode())
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
    return HealthResponse(status="ok", db_mode=db.mode(), gemini_configured=settings.gemini_configured, version=VERSION)
