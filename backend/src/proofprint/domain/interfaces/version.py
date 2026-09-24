from datetime import datetime
from typing import Any, Protocol
from uuid import UUID

from proofprint.domain.entities.draft import Asset, SpecificationBlock
from proofprint.domain.entities.version import ReviewRound, SpecificationVersion
from proofprint.domain.entities.workspace import WorkspaceGrant, WorkspaceSummary


class VersionRepository(Protocol):
    def get_workspace(self, workspace_id: UUID) -> WorkspaceSummary | None: ...

    def get_workspace_for_update(self, workspace_id: UUID) -> WorkspaceSummary | None: ...

    def get_active_grant(self, workspace_id: UUID, user_id: UUID) -> WorkspaceGrant | None: ...

    def list_blocks(self, workspace_id: UUID) -> list[SpecificationBlock]: ...

    def get_asset(self, workspace_id: UUID, asset_id: UUID) -> Asset | None: ...

    def list_versions(self, workspace_id: UUID) -> list[SpecificationVersion]: ...

    def has_image_reference(self, workspace_id: UUID, asset_id: UUID) -> bool: ...

    def get_version(
        self, workspace_id: UUID, version_id: UUID
    ) -> SpecificationVersion | None: ...

    def get_latest_version(self, workspace_id: UUID) -> SpecificationVersion | None: ...

    def add_version(self, version: SpecificationVersion) -> None: ...

    def resolve_draft_requests(
        self, workspace_id: UUID, block_ids: list[UUID], version_id: UUID
    ) -> int: ...

    def get_review_round(
        self, workspace_id: UUID, review_round_id: UUID
    ) -> ReviewRound | None: ...

    def get_review_round_for_version(
        self, workspace_id: UUID, version_id: UUID
    ) -> ReviewRound | None: ...

    def get_open_review_round(self, workspace_id: UUID) -> ReviewRound | None: ...

    def add_review_round(self, review_round: ReviewRound) -> None: ...

    def mark_workspace_released(
        self,
        workspace_id: UUID,
        *,
        version_id: UUID,
        revision: int,
        updated_at: datetime,
    ) -> None: ...

    def add_audit_event(
        self,
        *,
        workspace_id: UUID,
        actor_id: UUID,
        event_type: str,
        entity_type: str,
        entity_id: UUID,
        version_id: UUID | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> None: ...

    def add_outbox_message(self, event_type: str, payload: dict[str, Any]) -> None: ...

    def get_idempotent_result(
        self,
        *,
        actor_id: UUID,
        workspace_id: UUID,
        operation: str,
        idempotency_key: str,
    ) -> tuple[str, dict[str, Any]] | None: ...

    def add_idempotent_result(
        self,
        *,
        actor_id: UUID,
        workspace_id: UUID,
        operation: str,
        idempotency_key: str,
        request_fingerprint: str,
        response_payload: dict[str, Any],
    ) -> None: ...

    def record_guest_version_view(
        self,
        *,
        guest_session_id: UUID,
        workspace_id: UUID,
        version_id: UUID,
        viewed_at: datetime,
    ) -> None: ...
