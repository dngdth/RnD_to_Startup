from datetime import datetime
from uuid import UUID

from fastapi import APIRouter
from pydantic import BaseModel

from proofprint.domain.identity import SystemRole, WorkspaceGrant, WorkspaceSummary
from proofprint.presentation.dependencies import CurrentActorDep, WorkspaceQueryDep

router = APIRouter(prefix="/api/v1/workspaces", tags=["workspaces"])


class WorkspacePermissionsResponse(BaseModel):
    role: SystemRole
    can_view: bool
    can_edit: bool
    can_review: bool
    can_approve: bool
    can_lock_production: bool


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


def workspace_view(
    workspace: WorkspaceSummary, grant: WorkspaceGrant | None = None
) -> WorkspaceResponse:
    permissions = None
    if grant is not None:
        permissions = WorkspacePermissionsResponse(
            role=grant.role,
            can_view=grant.can_view,
            can_edit=grant.can_edit,
            can_review=grant.can_review,
            can_approve=grant.can_approve,
            can_lock_production=grant.can_lock_production,
        )
    return WorkspaceResponse(
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
        permissions=permissions,
    )


@router.get("", response_model=list[WorkspaceResponse])
def list_workspaces(
    actor: CurrentActorDep, workspaces: WorkspaceQueryDep
) -> list[WorkspaceResponse]:
    return [workspace_view(item) for item in workspaces.list_for(actor)]


@router.get("/{workspace_id}", response_model=WorkspaceResponse)
def get_workspace(
    workspace_id: UUID,
    actor: CurrentActorDep,
    workspaces: WorkspaceQueryDep,
) -> WorkspaceResponse:
    workspace, grant = workspaces.get_for(actor, workspace_id)
    return workspace_view(workspace, grant)
