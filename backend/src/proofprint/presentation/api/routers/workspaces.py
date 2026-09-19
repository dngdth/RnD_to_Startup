from uuid import UUID

from fastapi import APIRouter

from proofprint.presentation.api.dependencies import (
    CurrentActorDep,
    GetWorkspaceDep,
    ListWorkspacesDep,
)
from proofprint.presentation.schemas.workspaces import WorkspaceResponse

router = APIRouter(prefix="/workspaces", tags=["workspaces"])


@router.get("", response_model=list[WorkspaceResponse])
def list_workspaces(
    actor: CurrentActorDep, use_case: ListWorkspacesDep
) -> list[WorkspaceResponse]:
    return [WorkspaceResponse.from_domain(item) for item in use_case.execute(actor)]


@router.get("/{workspace_id}", response_model=WorkspaceResponse)
def get_workspace(
    workspace_id: UUID,
    actor: CurrentActorDep,
    use_case: GetWorkspaceDep,
) -> WorkspaceResponse:
    workspace, grant = use_case.execute(actor, workspace_id)
    return WorkspaceResponse.from_domain(workspace, grant)
