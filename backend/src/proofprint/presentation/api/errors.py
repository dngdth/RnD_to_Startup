from uuid import uuid4

from fastapi import Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException

from proofprint.domain.exceptions import (
    ApplicationError,
    AuthenticationRequired,
    Conflict,
    PermissionDenied,
    PreconditionFailed,
    ResourceNotFound,
)


def error_response(
    *, status_code: int, code: str, message: str, details: dict | list | None = None,
    headers: dict[str, str] | None = None,
) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={
            "code": code,
            "message": message,
            "details": details if details is not None else {},
            "trace_id": str(uuid4()),
        },
        headers=headers,
    )


async def handle_application_error(_request: Request, exc: ApplicationError) -> JSONResponse:
    headers: dict[str, str] | None = None
    if isinstance(exc, AuthenticationRequired):
        code = status.HTTP_401_UNAUTHORIZED
        error_code = "AUTHENTICATION_REQUIRED"
        headers = {"WWW-Authenticate": "Bearer"}
    elif isinstance(exc, PermissionDenied):
        code = status.HTTP_403_FORBIDDEN
        error_code = "ACCESS_DENIED"
    elif isinstance(exc, ResourceNotFound):
        code = status.HTTP_404_NOT_FOUND
        resource = str(exc).lower()
        error_code = next(
            (
                value for label, value in (
                    ("workspace", "WORKSPACE_NOT_FOUND"),
                    ("version", "VERSION_NOT_FOUND"),
                    ("change request", "CHANGE_REQUEST_NOT_FOUND"),
                    ("asset", "ASSET_NOT_FOUND"),
                    ("review link", "REVIEW_LINK_NOT_FOUND"),
                ) if label in resource
            ),
            "RESOURCE_NOT_FOUND",
        )
    elif isinstance(exc, Conflict):
        code = status.HTTP_409_CONFLICT
        message = str(exc)
        if "Idempotency-Key" in message:
            error_code = "IDEMPOTENCY_KEY_REUSED"
        elif "identical to the latest" in message:
            error_code = "SPECIFICATION_UNCHANGED"
        elif "APPROVAL_VERSION_MISMATCH" in message:
            error_code = "APPROVAL_VERSION_MISMATCH"
        elif "At least one REQUESTED change request" in message:
            error_code = "CHANGE_REQUEST_REQUIRED"
        else:
            error_code = "INVALID_STATE_TRANSITION"
    elif isinstance(exc, PreconditionFailed):
        code = status.HTTP_412_PRECONDITION_FAILED
        error_code = "WORKSPACE_REVISION_MISMATCH"
    else:
        code = status.HTTP_422_UNPROCESSABLE_ENTITY
        error_code = "SPECIFICATION_INVALID"
    return error_response(
        status_code=code, code=error_code, message=str(exc), headers=headers
    )


async def handle_request_validation_error(
    _request: Request, exc: RequestValidationError
) -> JSONResponse:
    details = [
        {"loc": list(error["loc"]), "type": error["type"], "message": error["msg"]}
        for error in exc.errors()
    ]
    return error_response(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        code="REQUEST_VALIDATION_FAILED",
        message="Request validation failed",
        details=details,
    )


async def handle_http_error(_request: Request, exc: HTTPException) -> JSONResponse:
    return error_response(
        status_code=exc.status_code,
        code={
            401: "AUTHENTICATION_REQUIRED",
            403: "ACCESS_DENIED",
            404: "ROUTE_NOT_FOUND",
            405: "METHOD_NOT_ALLOWED",
        }.get(exc.status_code, "HTTP_ERROR"),
        message=str(exc.detail),
        headers=exc.headers,
    )
