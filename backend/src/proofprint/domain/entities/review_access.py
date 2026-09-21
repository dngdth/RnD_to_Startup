from dataclasses import dataclass
from datetime import datetime
from enum import StrEnum
from uuid import UUID


class ReviewLinkStatus(StrEnum):
    ACTIVE = "ACTIVE"
    DISABLED = "DISABLED"


class GuestSessionStatus(StrEnum):
    ACTIVE = "ACTIVE"
    REVOKED = "REVOKED"
    EXPIRED = "EXPIRED"


@dataclass(frozen=True, slots=True)
class WorkspaceReviewLink:
    id: UUID
    workspace_id: UUID
    version: int
    status: ReviewLinkStatus
    created_by: UUID
    created_at: datetime
    disabled_by: UUID | None = None
    disabled_at: datetime | None = None
    disabled_reason: str | None = None
    replaced_by_link_id: UUID | None = None


@dataclass(frozen=True, slots=True)
class WorkspaceGuestSession:
    id: UUID
    review_link_id: UUID
    workspace_id: UUID
    username: str
    token_hash: str
    status: GuestSessionStatus
    created_at: datetime
    expires_at: datetime
    revoked_at: datetime | None = None


@dataclass(frozen=True, slots=True)
class GuestPrincipal:
    session_id: UUID
    review_link_id: UUID
    workspace_id: UUID
    username: str
    link_version: int
