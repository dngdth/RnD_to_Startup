from proofprint.domain.entities.identity import CurrentActor, SystemRole
from proofprint.domain.entities.workspace import WorkspaceSummary
from proofprint.domain.interfaces.workspace import WorkspaceAccessRepository


class ListWorkspaces:
    def __init__(self, workspaces: WorkspaceAccessRepository) -> None:
        self.workspaces = workspaces

    def execute(self, actor: CurrentActor) -> list[WorkspaceSummary]:
        if actor.system_role == SystemRole.ADMIN:
            return self.workspaces.list_all()
        return self.workspaces.list_visible_to(actor.id)
