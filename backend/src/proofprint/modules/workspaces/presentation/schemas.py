from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

from proofprint.modules.identity.domain import SystemRole
from proofprint.modules.workspaces.domain import WorkspaceGrant, WorkspaceSummary


class WorkspacePermissionsResponse(BaseModel):
    role: SystemRole
    can_view: bool
    can_edit: bool
    can_review: bool
    can_approve: bool
    can_lock_production: bool

    @classmethod
    def from_domain(cls, grant: WorkspaceGrant) -> WorkspacePermissionsResponse:
        return cls(
            role=grant.role,
            can_view=grant.can_view,
            can_edit=grant.can_edit,
            can_review=grant.can_review,
            can_approve=grant.can_approve,
            can_lock_production=grant.can_lock_production,
        )


class WorkspaceResponse(BaseModel):
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
    permissions: WorkspacePermissionsResponse | None = None

    @classmethod
    def from_domain(
        cls, workspace: WorkspaceSummary, grant: WorkspaceGrant | None = None
    ) -> WorkspaceResponse:
        return cls(
            id=workspace.id,
            customer_id=workspace.customer_id,
            product_type=workspace.product_type,
            workflow_status=workspace.workflow_status,
            record_status=workspace.record_status,
            latest_version_id=workspace.latest_version_id,
            approved_version_id=workspace.approved_version_id,
            production_version_id=workspace.production_version_id,
            revision=workspace.revision,
            updated_at=workspace.updated_at,
            permissions=(
                WorkspacePermissionsResponse.from_domain(grant) if grant is not None else None
            ),
        )
