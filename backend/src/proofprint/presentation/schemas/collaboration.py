from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from proofprint.domain.entities.collaboration import (
    ChangeRequest,
    ChangeRequestStatus,
    Comment,
)
from proofprint.presentation.schemas.versions import ReviewRoundResponse


class CreateCommentRequest(BaseModel):
    body: str = Field(min_length=1, max_length=5000)
    version_id: UUID | None = None
    block_id: UUID | None = None
    change_request_id: UUID | None = None

    @field_validator("body")
    @classmethod
    def normalize_body(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("body must not be blank")
        return normalized


class CommentResponse(BaseModel):
    id: UUID
    workspace_id: UUID
    version_id: UUID | None
    block_id: UUID | None
    change_request_id: UUID | None
    body: str
    author_id: UUID | None
    guest_session_id: UUID | None
    author_username: str | None
    created_at: datetime

    @classmethod
    def from_domain(cls, value: Comment) -> CommentResponse:
        return cls(
            id=value.id,
            workspace_id=value.workspace_id,
            version_id=value.version_id,
            block_id=value.block_id,
            change_request_id=value.change_request_id,
            body=value.body,
            author_id=value.author_id,
            guest_session_id=value.guest_session_id,
            author_username=value.author_username_snapshot,
            created_at=value.created_at,
        )


class CommentCreatedResponse(BaseModel):
    comment: CommentResponse
    workspace_revision: int


class CreateChangeRequestRequest(BaseModel):
    block_id: UUID
    field_path: str | None = Field(default=None, max_length=500)
    message: str = Field(min_length=1, max_length=5000)

    @field_validator("field_path")
    @classmethod
    def normalize_path(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        if not normalized:
            raise ValueError("field_path must not be blank")
        return normalized

    @field_validator("message")
    @classmethod
    def normalize_message(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("message must not be blank")
        return normalized


class ChangeRequestResponse(BaseModel):
    id: UUID
    workspace_id: UUID
    review_round_id: UUID
    version_id: UUID
    block_id: UUID
    field_path: str | None
    message: str
    status: ChangeRequestStatus
    requested_by: UUID | None
    requested_by_guest_session_id: UUID | None
    requester_username: str | None
    acknowledged_by: UUID | None
    resolved_in_version_id: UUID | None
    parent_change_request_id: UUID | None
    resolution_note: str | None
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_domain(cls, value: ChangeRequest) -> ChangeRequestResponse:
        return cls(
            id=value.id,
            workspace_id=value.workspace_id,
            review_round_id=value.review_round_id,
            version_id=value.version_id,
            block_id=value.block_id,
            field_path=value.field_path,
            message=value.message,
            status=value.status,
            requested_by=value.requested_by,
            requested_by_guest_session_id=value.requested_by_guest_session_id,
            requester_username=value.requester_username_snapshot,
            acknowledged_by=value.acknowledged_by,
            resolved_in_version_id=value.resolved_in_version_id,
            parent_change_request_id=value.parent_change_request_id,
            resolution_note=value.resolution_note,
            created_at=value.created_at,
            updated_at=value.updated_at,
        )


class ChangeRequestMutationResponse(BaseModel):
    change_request: ChangeRequestResponse
    workspace_revision: int


class MarkUpdatedRequest(BaseModel):
    resolved_in_version_id: UUID


class RejectChangeRequestRequest(BaseModel):
    resolution_note: str = Field(min_length=1, max_length=5000)


class ReopenChangeRequestRequest(BaseModel):
    message: str | None = Field(default=None, min_length=1, max_length=5000)


class ReopenedChangeRequestResponse(BaseModel):
    reopened_change_request: ChangeRequestResponse
    new_change_request: ChangeRequestResponse
    workspace_revision: int


class RequestChangesRequest(BaseModel):
    decision_note: str | None = Field(default=None, min_length=1, max_length=2000)


class ReviewChangesRequestedResponse(BaseModel):
    review_round: ReviewRoundResponse
    workspace_revision: int
