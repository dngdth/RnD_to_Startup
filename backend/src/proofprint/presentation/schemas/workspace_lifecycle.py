from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from proofprint.domain.entities.workspace_lifecycle import WorkspaceAuditEvent, WorkspaceAuditPage


class ArchiveWorkspaceRequest(BaseModel):
    reason: str = Field(min_length=3, max_length=500)

    @field_validator("reason")
    @classmethod
    def normalize_reason(cls, value: str) -> str:
        normalized = value.strip()
        if len(normalized) < 3:
            raise ValueError("reason must contain at least 3 characters")
        return normalized


class OptionalWorkspaceReasonRequest(BaseModel):
    reason: str | None = Field(default=None, max_length=500)

    @field_validator("reason")
    @classmethod
    def normalize_reason(cls, value: str | None) -> str | None:
        return value.strip() or None if value is not None else None


class WorkspaceAuditEventResponse(BaseModel):
    id: UUID
    workspace_id: UUID
    actor_id: UUID | None
    guest_session_id: UUID | None
    actor_username_snapshot: str | None
    event_type: str
    entity_type: str
    entity_id: UUID
    version_id: UUID | None
    metadata: dict[str, Any]
    created_at: datetime

    @classmethod
    def from_domain(cls, event: WorkspaceAuditEvent) -> "WorkspaceAuditEventResponse":
        return cls(**{field: getattr(event, field) for field in cls.model_fields})


class WorkspaceAuditPageResponse(BaseModel):
    items: list[WorkspaceAuditEventResponse]
    total: int
    limit: int
    offset: int

    @classmethod
    def from_domain(cls, page: WorkspaceAuditPage) -> "WorkspaceAuditPageResponse":
        return cls(
            items=[WorkspaceAuditEventResponse.from_domain(item) for item in page.items],
            total=page.total,
            limit=page.limit,
            offset=page.offset,
        )
