from uuid import UUID

from fastapi import APIRouter

from proofprint.modules.identity.presentation.dependencies import CurrentActorDep
from proofprint.modules.workspaces.presentation.dependencies import WorkspaceQueryDep
from proofprint.modules.workspaces.presentation.schemas import WorkspaceResponse

router = APIRouter(prefix="/workspaces", tags=["workspaces"])


@router.get("", response_model=list[WorkspaceResponse])
def list_workspaces(
    actor: CurrentActorDep, workspaces: WorkspaceQueryDep
) -> list[WorkspaceResponse]:
    return [WorkspaceResponse.from_domain(item) for item in workspaces.list_for(actor)]


@router.get("/{workspace_id}", response_model=WorkspaceResponse)
def get_workspace(
    workspace_id: UUID,
    actor: CurrentActorDep,
    workspaces: WorkspaceQueryDep,
) -> WorkspaceResponse:
    workspace, grant = workspaces.get_for(actor, workspace_id)
    return WorkspaceResponse.from_domain(workspace, grant)
