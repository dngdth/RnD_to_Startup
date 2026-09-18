from uuid import UUID

from proofprint.core.errors import PermissionDenied, ResourceNotFound
from proofprint.modules.identity.domain import CurrentActor, SystemRole
from proofprint.modules.workspaces.domain import (
    WorkspaceAccessRepository,
    WorkspaceGrant,
    WorkspaceSummary,
)


class WorkspaceQueryService:
    def __init__(self, workspaces: WorkspaceAccessRepository) -> None:
        self.workspaces = workspaces

    def list_for(self, actor: CurrentActor) -> list[WorkspaceSummary]:
        if actor.system_role == SystemRole.ADMIN:
            return self.workspaces.list_all()
        return self.workspaces.list_visible_to(actor.id)

    def get_for(
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
            # Hide resource existence from authenticated users outside its scope.
            raise ResourceNotFound("Workspace was not found")
        if not grant.can_view:
            raise PermissionDenied("You do not have permission to view this workspace")
        return workspace, grant
