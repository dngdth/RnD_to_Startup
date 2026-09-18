from fastapi import APIRouter, Request, status
from fastapi.responses import JSONResponse

from proofprint.domain.errors import (
    ApplicationError,
    AuthenticationRequired,
    PermissionDenied,
    ResourceNotFound,
)

router = APIRouter()


@router.get("/health", tags=["system"])
def health() -> dict[str, str]:
    return {"status": "ok"}


async def handle_application_error(_request: Request, exc: ApplicationError) -> JSONResponse:
    headers: dict[str, str] | None = None
    if isinstance(exc, AuthenticationRequired):
        code = status.HTTP_401_UNAUTHORIZED
        headers = {"WWW-Authenticate": "Bearer"}
    elif isinstance(exc, PermissionDenied):
        code = status.HTTP_403_FORBIDDEN
    elif isinstance(exc, ResourceNotFound):
        code = status.HTTP_404_NOT_FOUND
    else:
        code = status.HTTP_422_UNPROCESSABLE_ENTITY
    return JSONResponse(status_code=code, content={"detail": str(exc)}, headers=headers)
