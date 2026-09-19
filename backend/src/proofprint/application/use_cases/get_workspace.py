from uuid import UUID

from proofprint.domain.entities.identity import CurrentActor, SystemRole
from proofprint.domain.entities.workspace import WorkspaceGrant, WorkspaceSummary
from proofprint.domain.exceptions import PermissionDenied, ResourceNotFound
from proofprint.domain.interfaces.workspace import WorkspaceAccessRepository


class GetWorkspace:
    def __init__(self, workspaces: WorkspaceAccessRepository) -> None:
        self.workspaces = workspaces

    def execute(
        self, actor: CurrentActor, workspace_id: UUID
    ) -> tuple[WorkspaceSummary, WorkspaceGrant]:
        workspace = self.workspaces.get(workspace_id)
        if workspace is None:
            raise ResourceNotFound("Workspace was not found")

        if actor.system_role == SystemRole.ADMIN:
            return workspace, WorkspaceGrant(
                workspace_id=workspace_id,
                role=SystemRole.ADMIN,
                can_view=True,
                can_edit=True,
                can_review=True,
                can_approve=True,
                can_lock_production=True,
            )

        grant = self.workspaces.get_active_grant(workspace_id, actor.id)
        if grant is None:
            raise ResourceNotFound("Workspace was not found")
        if not grant.can_view:
            raise PermissionDenied("You do not have permission to view this workspace")
        return workspace, grant
