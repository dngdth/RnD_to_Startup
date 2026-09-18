from fastapi import FastAPI

from proofprint.api.errors import handle_application_error
from proofprint.api.health import router as health_router
from proofprint.api.v1 import router as v1_router
from proofprint.core.errors import ApplicationError


def create_app() -> FastAPI:
    app = FastAPI(title="ProofPrint API", version="0.2.0")
    app.include_router(health_router)
    app.include_router(v1_router)
    app.add_exception_handler(ApplicationError, handle_application_error)
    return app


app = create_app()

__all__ = ["app"]
