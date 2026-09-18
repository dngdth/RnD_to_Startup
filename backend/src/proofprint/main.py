from fastapi import FastAPI

from proofprint.domain.errors import ApplicationError
from proofprint.presentation.api import handle_application_error
from proofprint.presentation.api import router as system_router
from proofprint.presentation.auth_api import router as auth_router
from proofprint.presentation.workspace_api import router as workspace_router


def create_app() -> FastAPI:
    app = FastAPI(title="ProofPrint API", version="0.2.0")
    app.include_router(system_router)
    app.include_router(auth_router)
    app.include_router(workspace_router)
    app.add_exception_handler(ApplicationError, handle_application_error)
    return app


app = create_app()

__all__ = ["app"]
