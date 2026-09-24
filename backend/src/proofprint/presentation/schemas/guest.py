from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from proofprint.presentation.schemas.draft import SpecificationBlockResponse
from proofprint.presentation.schemas.workspaces import WorkspaceResponse


class CreateGuestSessionRequest(BaseModel):
    review_token: str = Field(min_length=20, max_length=500)
    username: str = Field(min_length=1, max_length=100)

    @field_validator("username")
    @classmethod
    def normalize_username(cls, value: str) -> str:
        normalized = " ".join(value.strip().split())
        if not normalized:
            raise ValueError("username must not be blank")
        return normalized


class GuestSessionResponse(BaseModel):
    workspace_id: UUID
    username: str
    expires_at: datetime


class GuestWorkspaceResponse(BaseModel):
    review_link_id: UUID
    reviewer_username: str
    workspace: WorkspaceResponse
    draft_blocks: list[SpecificationBlockResponse] = Field(default_factory=list)
