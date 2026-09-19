from fastapi import FastAPI

from proofprint.domain.exceptions import ApplicationError
from proofprint.presentation.api.errors import handle_application_error
from proofprint.presentation.api.router import api_router
from proofprint.presentation.api.routers.health import router as health_router


def create_app() -> FastAPI:
    app = FastAPI(title="ProofPrint API", version="0.2.0")
    app.include_router(health_router)
    app.include_router(api_router)
    app.add_exception_handler(ApplicationError, handle_application_error)
    return app


app = create_app()

__all__ = ["app"]
