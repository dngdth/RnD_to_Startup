from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from starlette.exceptions import HTTPException

from proofprint.domain.exceptions import ApplicationError
from proofprint.infrastructure.database import settings
from proofprint.infrastructure.embedded_zalo_workers import EmbeddedZaloWorkers
from proofprint.presentation.api.errors import (
    handle_application_error,
    handle_http_error,
    handle_request_validation_error,
)
from proofprint.presentation.api.router import api_router
from proofprint.presentation.api.routers.health import router as health_router


def create_app(*, start_background_workers: bool = False) -> FastAPI:
    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        workers = EmbeddedZaloWorkers()
        app.state.zalo_workers = workers
        workers.start()
        try:
            yield
        finally:
            workers.stop()

    app = FastAPI(
        title="ProofPrint API",
        version="0.2.0",
        lifespan=lifespan if start_background_workers else None,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(health_router)
    app.include_router(api_router)
    app.add_exception_handler(ApplicationError, handle_application_error)
    app.add_exception_handler(RequestValidationError, handle_request_validation_error)
    app.add_exception_handler(HTTPException, handle_http_error)
    return app


app = create_app(start_background_workers=True)

__all__ = ["app"]
