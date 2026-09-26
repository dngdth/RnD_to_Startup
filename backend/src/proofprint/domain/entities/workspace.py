from dataclasses import dataclass
from datetime import datetime
from uuid import UUID

from proofprint.domain.entities.identity import SystemRole


@dataclass(frozen=True, slots=True)
class WorkspaceCustomer:
    id: UUID
    name: str
    email: str | None
    phone: str | None


@dataclass(frozen=True, slots=True)
class WorkspaceGrant:
    workspace_id: UUID
    role: SystemRole
    can_view: bool
    can_edit: bool
    can_review: bool
    can_approve: bool
    can_lock_production: bool


@dataclass(frozen=True, slots=True)
class WorkspaceSummary:
    id: UUID
    customer_id: UUID
    customer_name: str
    customer_email: str | None
    customer_phone: str | None
    product_type: str
    workflow_status: str
    record_status: str
    latest_version_id: UUID | None
    approved_version_id: UUID | None
    production_version_id: UUID | None
    revision: int
    updated_at: datetime
    assigned_designer_id: UUID | None = None
