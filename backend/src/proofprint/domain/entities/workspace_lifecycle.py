from dataclasses import dataclass
from datetime import datetime
from typing import Any
from uuid import UUID


@dataclass(frozen=True, slots=True)
class WorkspaceAuditEvent:
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


@dataclass(frozen=True, slots=True)
class WorkspaceAuditPage:
    items: list[WorkspaceAuditEvent]
    total: int
    limit: int
    offset: int
