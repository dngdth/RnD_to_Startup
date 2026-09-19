import re
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from proofprint.presentation.schemas.workspaces import WorkspaceResponse


class CreateGuestSessionRequest(BaseModel):
    review_token: str = Field(min_length=20, max_length=500)
    email: str = Field(min_length=3, max_length=320)

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        normalized = value.strip().lower()
        if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", normalized):
            raise ValueError("A valid email address is required")
        return normalized


class GuestSessionResponse(BaseModel):
    workspace_id: UUID
    email: str
    expires_at: datetime


class GuestWorkspaceResponse(BaseModel):
    reviewer_email: str
    workspace: WorkspaceResponse
