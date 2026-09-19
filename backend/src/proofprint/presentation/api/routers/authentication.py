from datetime import UTC, datetime

from fastapi import APIRouter

from proofprint.presentation.api.dependencies import AuthenticateUserDep, CurrentActorDep
from proofprint.presentation.schemas.identity import (
    CurrentUserResponse,
    LoginRequest,
    TokenResponse,
)

router = APIRouter(prefix="/auth", tags=["authentication"])


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, authenticate: AuthenticateUserDep) -> TokenResponse:
    issued = authenticate.execute(email=payload.email, password=payload.password)
    expires_in = max(0, int((issued.expires_at - datetime.now(UTC)).total_seconds()))
    return TokenResponse(access_token=issued.value, expires_in=expires_in)


@router.get("/me", response_model=CurrentUserResponse)
def current_user(actor: CurrentActorDep) -> CurrentUserResponse:
    return CurrentUserResponse(
        id=actor.id,
        email=actor.email,
        display_name=actor.display_name,
        system_role=actor.system_role,
    )
