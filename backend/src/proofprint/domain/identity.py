from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from enum import StrEnum
from uuid import UUID


class SystemRole(StrEnum):
    ADMIN = "ADMIN"
    DESIGNER = "DESIGNER"
    CUSTOMER = "CUSTOMER"


class UserStatus(StrEnum):
    ACTIVE = "ACTIVE"
    DISABLED = "DISABLED"


@dataclass(frozen=True, slots=True)
class CurrentActor:
    id: UUID
    email: str
    display_name: str
    system_role: SystemRole


@dataclass(frozen=True, slots=True)
class AuthenticationRecord:
    id: UUID
    email: str
    display_name: str
    system_role: SystemRole
    status: UserStatus
    password_hash: str
    must_change_password: bool

    def as_actor(self) -> CurrentActor:
        return CurrentActor(
            id=self.id,
            email=self.email,
            display_name=self.display_name,
            system_role=self.system_role,
        )


@dataclass(frozen=True, slots=True)
class IssuedAccessToken:
    value: str
    expires_at: datetime


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
    product_type: str
    workflow_status: str
    record_status: str
    latest_version_id: UUID | None
    approved_version_id: UUID | None
    production_version_id: UUID | None
    revision: int
    updated_at: datetime
