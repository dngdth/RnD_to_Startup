from proofprint.domain.entities.identity import CurrentActor, SystemRole
from proofprint.domain.entities.workspace import WorkspaceSummary
from proofprint.domain.exceptions import PermissionDenied
from proofprint.domain.interfaces.workspace import WorkspaceAccessRepository


class ListWorkspaces:
    def __init__(self, workspaces: WorkspaceAccessRepository) -> None:
        self.workspaces = workspaces

    def execute(self, actor: CurrentActor) -> list[WorkspaceSummary]:
        if actor.system_role != SystemRole.DESIGNER:
            raise PermissionDenied("Only designers can access workspaces")
        return self.workspaces.list_visible_to(actor.id)
