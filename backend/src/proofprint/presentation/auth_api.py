from datetime import UTC, datetime
from typing import Literal
from uuid import UUID

from fastapi import APIRouter
from pydantic import BaseModel, Field

from proofprint.domain.identity import SystemRole
from proofprint.presentation.dependencies import AuthenticationDep, CurrentActorDep

router = APIRouter(prefix="/api/v1/auth", tags=["authentication"])


class LoginRequest(BaseModel):
    email: str = Field(min_length=3, max_length=320)
    password: str = Field(min_length=8, max_length=128)


class TokenResponse(BaseModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"
    expires_in: int


class CurrentUserResponse(BaseModel):
    id: UUID
    email: str
    display_name: str
    system_role: SystemRole


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, authentication: AuthenticationDep) -> TokenResponse:
    issued = authentication.login(email=payload.email, password=payload.password)
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
