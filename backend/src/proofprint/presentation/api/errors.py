from fastapi import Request, status
from fastapi.responses import JSONResponse

from proofprint.domain.exceptions import (
    ApplicationError,
    AuthenticationRequired,
    Conflict,
    PermissionDenied,
    ResourceNotFound,
)


async def handle_application_error(_request: Request, exc: ApplicationError) -> JSONResponse:
    headers: dict[str, str] | None = None
    if isinstance(exc, AuthenticationRequired):
        code = status.HTTP_401_UNAUTHORIZED
        headers = {"WWW-Authenticate": "Bearer"}
    elif isinstance(exc, PermissionDenied):
        code = status.HTTP_403_FORBIDDEN
    elif isinstance(exc, ResourceNotFound):
        code = status.HTTP_404_NOT_FOUND
    elif isinstance(exc, Conflict):
        code = status.HTTP_409_CONFLICT
    else:
        code = status.HTTP_422_UNPROCESSABLE_ENTITY
    return JSONResponse(status_code=code, content={"detail": str(exc)}, headers=headers)
