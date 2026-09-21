from datetime import datetime
from typing import Any, Protocol
from uuid import UUID

from proofprint.domain.entities.draft import Asset, SpecificationBlock
from proofprint.domain.entities.workspace import WorkspaceGrant, WorkspaceSummary


class DraftRepository(Protocol):
    def get_workspace(self, workspace_id: UUID) -> WorkspaceSummary | None: ...

    def get_workspace_for_update(self, workspace_id: UUID) -> WorkspaceSummary | None: ...

    def get_active_grant(self, workspace_id: UUID, user_id: UUID) -> WorkspaceGrant | None: ...

    def list_blocks(self, workspace_id: UUID) -> list[SpecificationBlock]: ...

    def get_block(self, workspace_id: UUID, block_id: UUID) -> SpecificationBlock | None: ...

    def upsert_block(self, block: SpecificationBlock) -> None: ...

    def delete_block(self, workspace_id: UUID, block_id: UUID) -> None: ...

    def set_block_positions(
        self,
        workspace_id: UUID,
        block_ids: list[UUID],
        *,
        updated_by: UUID,
        updated_at: datetime,
    ) -> None: ...

    def update_workspace(
        self,
        workspace_id: UUID,
        *,
        revision: int,
        updated_at: datetime,
        workflow_status: str | None = None,
    ) -> None: ...

    def add_asset(self, asset: Asset) -> None: ...

    def get_asset(self, workspace_id: UUID, asset_id: UUID) -> Asset | None: ...

    def storage_key_exists(self, storage_key: str) -> bool: ...

    def add_audit_event(
        self,
        *,
        workspace_id: UUID,
        actor_id: UUID,
        event_type: str,
        entity_type: str,
        entity_id: UUID,
        metadata: dict[str, Any] | None = None,
    ) -> None: ...
