from typing import Protocol
from uuid import UUID

from proofprint.modules.workspaces.domain.entities import WorkspaceGrant, WorkspaceSummary


class WorkspaceAccessRepository(Protocol):
    def list_all(self) -> list[WorkspaceSummary]: ...

    def list_visible_to(self, user_id: UUID) -> list[WorkspaceSummary]: ...

    def get(self, workspace_id: UUID) -> WorkspaceSummary | None: ...

    def get_active_grant(self, workspace_id: UUID, user_id: UUID) -> WorkspaceGrant | None: ...
