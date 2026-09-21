from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from enum import StrEnum
from uuid import UUID


class ChangeRequestStatus(StrEnum):
    REQUESTED = "REQUESTED"
    ACKNOWLEDGED = "ACKNOWLEDGED"
    UPDATED = "UPDATED"
    CONFIRMED = "CONFIRMED"
    REOPENED = "REOPENED"
    REJECTED = "REJECTED"
    CANCELLED = "CANCELLED"


@dataclass(frozen=True, slots=True)
class Comment:
    id: UUID
    workspace_id: UUID
    version_id: UUID | None
    block_id: UUID | None
    change_request_id: UUID | None
    body: str
    author_id: UUID | None
    guest_session_id: UUID | None
    author_username_snapshot: str | None
    created_at: datetime


@dataclass(frozen=True, slots=True)
class ChangeRequest:
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
    requester_username_snapshot: str | None
    acknowledged_by: UUID | None
    resolved_in_version_id: UUID | None
    parent_change_request_id: UUID | None
    resolution_note: str | None
    created_at: datetime
    updated_at: datetime
