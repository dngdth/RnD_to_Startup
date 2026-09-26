from datetime import datetime
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session

from proofprint.domain.entities.draft import (
    Asset,
    AssetStatus,
    BlockType,
    SpecificationBlock,
)
from proofprint.domain.entities.identity import SystemRole
from proofprint.domain.entities.workspace import WorkspaceGrant, WorkspaceSummary
from proofprint.domain.exceptions import Conflict
from proofprint.infrastructure.models import (
    AssetImageDataRow,
    AssetRow,
    AuditEventRow,
    CustomerRow,
    IdempotencyRecordRow,
    ReviewRoundRow,
    SpecificationBlockRow,
    WorkspaceMembershipRow,
    WorkspaceRow,
)


class SqlAlchemyDraftRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def cancel_open_review_round(
        self, workspace_id: UUID, *, actor_id: UUID, reason: str, closed_at: datetime
    ) -> UUID | None:
        row = self.session.scalar(
            select(ReviewRoundRow)
            .where(ReviewRoundRow.workspace_id == workspace_id, ReviewRoundRow.status == "OPEN")
            .with_for_update()
        )
        if row is None:
            return None
        row.status = "CANCELLED"
        row.closed_at = closed_at
        row.decided_by = actor_id
        row.decision_note = reason
        self.session.flush()
        return row.id

    def get_start_revision_result(
        self, actor_id: UUID, workspace_id: UUID, key: str
    ) -> tuple[str, dict[str, Any]] | None:
        row = self.session.scalar(
            select(IdempotencyRecordRow).where(
                IdempotencyRecordRow.actor_id == actor_id,
                IdempotencyRecordRow.workspace_id == workspace_id,
                IdempotencyRecordRow.operation == "start-revision",
                IdempotencyRecordRow.idempotency_key == key,
            )
        )
        return (row.request_fingerprint, row.response_payload) if row else None

    def add_start_revision_result(
        self, actor_id: UUID, workspace_id: UUID, key: str,
        fingerprint: str, payload: dict[str, Any],
    ) -> None:
        self.session.add(
            IdempotencyRecordRow(
                id=uuid4(), actor_id=actor_id, guest_session_id=None,
                workspace_id=workspace_id, operation="start-revision",
                idempotency_key=key, request_fingerprint=fingerprint,
                response_payload=payload,
            )
        )

    def get_workspace(self, workspace_id: UUID) -> WorkspaceSummary | None:
        statement = (
            select(WorkspaceRow, CustomerRow)
            .join(CustomerRow, CustomerRow.id == WorkspaceRow.customer_id)
            .where(WorkspaceRow.id == workspace_id)
        )
        row = self.session.execute(statement).one_or_none()
        return self._workspace(*row) if row is not None else None

    def get_workspace_for_update(self, workspace_id: UUID) -> WorkspaceSummary | None:
        statement = (
            select(WorkspaceRow, CustomerRow)
            .join(CustomerRow, CustomerRow.id == WorkspaceRow.customer_id)
            .where(WorkspaceRow.id == workspace_id)
            .with_for_update(of=WorkspaceRow)
        )
        row = self.session.execute(statement).one_or_none()
        return self._workspace(*row) if row is not None else None

    def get_active_grant(self, workspace_id: UUID, user_id: UUID) -> WorkspaceGrant | None:
        statement = select(WorkspaceMembershipRow).where(
            WorkspaceMembershipRow.workspace_id == workspace_id,
            WorkspaceMembershipRow.user_id == user_id,
            WorkspaceMembershipRow.status == "ACTIVE",
        )
        row = self.session.scalar(statement)
        if row is None:
            return None
        return WorkspaceGrant(
            workspace_id=row.workspace_id,
            role=SystemRole(row.role),
            can_view=row.can_view,
            can_edit=row.can_edit,
            can_review=row.can_review,
            can_approve=row.can_approve,
            can_lock_production=row.can_lock_production,
        )

    def list_blocks(self, workspace_id: UUID) -> list[SpecificationBlock]:
        statement = (
            select(SpecificationBlockRow)
            .where(SpecificationBlockRow.workspace_id == workspace_id)
            .order_by(SpecificationBlockRow.position, SpecificationBlockRow.id)
        )
        return [self._block(row) for row in self.session.scalars(statement)]

    def get_block(self, workspace_id: UUID, block_id: UUID) -> SpecificationBlock | None:
        statement = select(SpecificationBlockRow).where(
            SpecificationBlockRow.id == block_id,
            SpecificationBlockRow.workspace_id == workspace_id,
        )
        row = self.session.scalar(statement)
        return self._block(row) if row is not None else None

    def upsert_block(self, block: SpecificationBlock) -> None:
        row = self.session.get(SpecificationBlockRow, block.id)
        if row is not None and row.workspace_id != block.workspace_id:
            raise Conflict("Block ID is already used by another workspace")
        if row is None:
            row = SpecificationBlockRow(
                id=block.id,
                workspace_id=block.workspace_id,
                block_type=block.block_type.value,
                label=block.label,
                content=block.content,
                position=block.position,
                schema_version=block.schema_version,
                created_by=block.created_by,
                updated_by=block.updated_by,
                created_at=block.created_at,
                updated_at=block.updated_at,
            )
            self.session.add(row)
        else:
            row.block_type = block.block_type.value
            row.label = block.label
            row.content = block.content
            row.position = block.position
            row.schema_version = block.schema_version
            row.updated_by = block.updated_by
            row.updated_at = block.updated_at
        self.session.flush()

    def delete_block(self, workspace_id: UUID, block_id: UUID) -> None:
        statement = select(SpecificationBlockRow).where(
            SpecificationBlockRow.id == block_id,
            SpecificationBlockRow.workspace_id == workspace_id,
        )
        row = self.session.scalar(statement)
        if row is not None:
            self.session.delete(row)
            self.session.flush()

    def set_block_positions(
        self,
        workspace_id: UUID,
        block_ids: list[UUID],
        *,
        updated_by: UUID,
        updated_at: datetime,
    ) -> None:
        statement = select(SpecificationBlockRow).where(
            SpecificationBlockRow.workspace_id == workspace_id
        )
        rows = {row.id: row for row in self.session.scalars(statement)}
        for position, block_id in enumerate(block_ids):
            rows[block_id].position = position
            rows[block_id].updated_by = updated_by
            rows[block_id].updated_at = updated_at
        self.session.flush()

    def update_workspace(
        self,
        workspace_id: UUID,
        *,
        revision: int,
        updated_at: datetime,
        workflow_status: str | None = None,
    ) -> None:
        row = self.session.get(WorkspaceRow, workspace_id)
        if row is None:
            return
        row.revision = revision
        row.updated_at = updated_at
        if workflow_status is not None:
            row.workflow_status = workflow_status
        self.session.flush()

    def add_asset(self, asset: Asset) -> None:
        self.session.add(
            AssetRow(
                id=asset.id,
                workspace_id=asset.workspace_id,
                storage_key=asset.storage_key,
                original_filename=asset.original_filename,
                content_type=asset.content_type,
                size_bytes=asset.size_bytes,
                checksum=asset.checksum,
                status=asset.status.value,
                uploaded_by=asset.uploaded_by,
                created_at=asset.created_at,
            )
        )
        self.session.flush()

    def get_asset(self, workspace_id: UUID, asset_id: UUID) -> Asset | None:
        statement = select(AssetRow).where(
            AssetRow.id == asset_id,
            AssetRow.workspace_id == workspace_id,
        )
        row = self.session.scalar(statement)
        return self._asset(row) if row is not None else None

    def add_image_data(self, asset_id: UUID, data: bytes) -> None:
        self.session.add(AssetImageDataRow(asset_id=asset_id, data=data))
        self.session.flush()

    def get_image_data(self, asset_id: UUID) -> bytes | None:
        row = self.session.get(AssetImageDataRow, asset_id)
        return row.data if row is not None else None

    def storage_key_exists(self, storage_key: str) -> bool:
        statement = select(AssetRow.id).where(AssetRow.storage_key == storage_key)
        return self.session.scalar(statement) is not None

    def add_audit_event(
        self,
        *,
        workspace_id: UUID,
        actor_id: UUID,
        event_type: str,
        entity_type: str,
        entity_id: UUID,
        metadata: dict[str, Any] | None = None,
    ) -> None:
        self.session.add(
            AuditEventRow(
                id=uuid4(),
                workspace_id=workspace_id,
                actor_id=actor_id,
                guest_session_id=None,
                actor_username_snapshot=None,
                event_type=event_type,
                entity_type=entity_type,
                entity_id=entity_id,
                version_id=None,
                metadata_json=metadata or {},
            )
        )

    @staticmethod
    def _workspace(row: WorkspaceRow, customer: CustomerRow) -> WorkspaceSummary:
        return WorkspaceSummary(
            id=row.id,
            customer_id=row.customer_id,
            customer_name=customer.name,
            customer_email=customer.email,
            customer_phone=customer.phone,
            product_type=row.product_type,
            workflow_status=row.workflow_status,
            record_status=row.record_status,
            latest_version_id=row.latest_version_id,
            approved_version_id=row.approved_version_id,
            production_version_id=row.production_version_id,
            revision=row.revision,
            updated_at=row.updated_at,
            assigned_designer_id=row.assigned_designer_id,
        )

    @staticmethod
    def _block(row: SpecificationBlockRow) -> SpecificationBlock:
        return SpecificationBlock(
            id=row.id,
            workspace_id=row.workspace_id,
            block_type=BlockType(row.block_type),
            label=row.label,
            content=row.content,
            position=row.position,
            schema_version=row.schema_version,
            created_by=row.created_by,
            updated_by=row.updated_by,
            created_at=row.created_at,
            updated_at=row.updated_at,
        )

    @staticmethod
    def _asset(row: AssetRow) -> Asset:
        return Asset(
            id=row.id,
            workspace_id=row.workspace_id,
            storage_key=row.storage_key,
            original_filename=row.original_filename,
            content_type=row.content_type,
            size_bytes=row.size_bytes,
            checksum=row.checksum,
            status=AssetStatus(row.status),
            uploaded_by=row.uploaded_by,
            created_at=row.created_at,
        )
