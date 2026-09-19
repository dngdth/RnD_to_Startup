from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

from proofprint.domain.entities.identity import SystemRole


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
