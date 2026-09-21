from datetime import datetime
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from proofprint.domain.entities.draft import (
    Asset,
    AssetStatus,
    BlockType,
    SpecificationBlock,
)
from proofprint.domain.entities.identity import SystemRole
from proofprint.domain.entities.version import (
    ReviewRound,
    ReviewRoundStatus,
    SpecificationVersion,
)
from proofprint.domain.entities.workspace import WorkspaceGrant, WorkspaceSummary
from proofprint.infrastructure.models import (
    AssetRow,
    AuditEventRow,
    CustomerRow,
    GuestVersionViewRow,
    IdempotencyRecordRow,
    OutboxMessageRow,
    ReviewRoundRow,
    SpecificationBlockRow,
    SpecificationVersionRow,
    WorkspaceMembershipRow,
    WorkspaceRow,
)


class SqlAlchemyVersionRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

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

    def get_asset(self, workspace_id: UUID, asset_id: UUID) -> Asset | None:
        statement = select(AssetRow).where(
            AssetRow.id == asset_id,
            AssetRow.workspace_id == workspace_id,
        )
        row = self.session.scalar(statement)
        return self._asset(row) if row is not None else None

    def list_versions(self, workspace_id: UUID) -> list[SpecificationVersion]:
        statement = (
            select(SpecificationVersionRow)
            .where(SpecificationVersionRow.workspace_id == workspace_id)
            .order_by(SpecificationVersionRow.number.desc())
        )
        return [self._version(row) for row in self.session.scalars(statement)]

    def get_version(
        self, workspace_id: UUID, version_id: UUID
    ) -> SpecificationVersion | None:
        statement = select(SpecificationVersionRow).where(
            SpecificationVersionRow.id == version_id,
            SpecificationVersionRow.workspace_id == workspace_id,
        )
        row = self.session.scalar(statement)
        return self._version(row) if row is not None else None

    def get_latest_version(self, workspace_id: UUID) -> SpecificationVersion | None:
        statement = (
            select(SpecificationVersionRow)
            .where(SpecificationVersionRow.workspace_id == workspace_id)
            .order_by(SpecificationVersionRow.number.desc())
            .limit(1)
        )
        row = self.session.scalar(statement)
        return self._version(row) if row is not None else None

    def add_version(self, version: SpecificationVersion) -> None:
        self.session.add(
            SpecificationVersionRow(
                id=version.id,
                workspace_id=version.workspace_id,
                number=version.number,
                previous_version_id=version.previous_version_id,
                snapshot=version.snapshot,
                content_hash=version.content_hash,
                schema_version=version.schema_version,
                created_by=version.created_by,
                created_at=version.created_at,
            )
        )
        self.session.flush()

    def get_review_round(
        self, workspace_id: UUID, review_round_id: UUID
    ) -> ReviewRound | None:
        statement = select(ReviewRoundRow).where(
            ReviewRoundRow.id == review_round_id,
            ReviewRoundRow.workspace_id == workspace_id,
        )
        row = self.session.scalar(statement)
        return self._review_round(row) if row is not None else None

    def get_review_round_for_version(
        self, workspace_id: UUID, version_id: UUID
    ) -> ReviewRound | None:
        statement = select(ReviewRoundRow).where(
            ReviewRoundRow.workspace_id == workspace_id,
            ReviewRoundRow.version_id == version_id,
        )
        row = self.session.scalar(statement)
        return self._review_round(row) if row is not None else None

    def get_open_review_round(self, workspace_id: UUID) -> ReviewRound | None:
        statement = select(ReviewRoundRow).where(
            ReviewRoundRow.workspace_id == workspace_id,
            ReviewRoundRow.status == ReviewRoundStatus.OPEN.value,
        )
        row = self.session.scalar(statement)
        return self._review_round(row) if row is not None else None

    def add_review_round(self, review_round: ReviewRound) -> None:
        self.session.add(
            ReviewRoundRow(
                id=review_round.id,
                workspace_id=review_round.workspace_id,
                version_id=review_round.version_id,
                status=review_round.status.value,
                opened_at=review_round.opened_at,
                closed_at=review_round.closed_at,
                decided_by=review_round.decided_by,
                decision_note=review_round.decision_note,
            )
        )
        self.session.flush()

    def mark_workspace_released(
        self,
        workspace_id: UUID,
        *,
        version_id: UUID,
        revision: int,
        updated_at: datetime,
    ) -> None:
        row = self.session.get(WorkspaceRow, workspace_id)
        if row is None:
            return
        row.latest_version_id = version_id
        row.workflow_status = "IN_REVIEW"
        row.revision = revision
        row.updated_at = updated_at
        self.session.flush()

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
                version_id=version_id,
                metadata_json=metadata or {},
            )
        )

    def add_outbox_message(self, event_type: str, payload: dict[str, Any]) -> None:
        self.session.add(
            OutboxMessageRow(
                id=uuid4(),
                event_type=event_type,
                payload=payload,
                status="PENDING",
            )
        )

    def get_idempotent_result(
        self,
        *,
        actor_id: UUID,
        workspace_id: UUID,
        operation: str,
        idempotency_key: str,
    ) -> tuple[str, dict[str, Any]] | None:
        statement = select(IdempotencyRecordRow).where(
            IdempotencyRecordRow.actor_id == actor_id,
            IdempotencyRecordRow.workspace_id == workspace_id,
            IdempotencyRecordRow.operation == operation,
            IdempotencyRecordRow.idempotency_key == idempotency_key,
        )
        row = self.session.scalar(statement)
        if row is None:
            return None
        return row.request_fingerprint, row.response_payload

    def add_idempotent_result(
        self,
        *,
        actor_id: UUID,
        workspace_id: UUID,
        operation: str,
        idempotency_key: str,
        request_fingerprint: str,
        response_payload: dict[str, Any],
    ) -> None:
        self.session.add(
            IdempotencyRecordRow(
                id=uuid4(),
                actor_id=actor_id,
                workspace_id=workspace_id,
                operation=operation,
                idempotency_key=idempotency_key,
                request_fingerprint=request_fingerprint,
                response_payload=response_payload,
            )
        )

    def record_guest_version_view(
        self,
        *,
        guest_session_id: UUID,
        workspace_id: UUID,
        version_id: UUID,
        viewed_at: datetime,
    ) -> None:
        statement = insert(GuestVersionViewRow).values(
            guest_session_id=guest_session_id,
            workspace_id=workspace_id,
            version_id=version_id,
            viewed_at=viewed_at,
        )
        statement = statement.on_conflict_do_update(
            index_elements=[
                GuestVersionViewRow.guest_session_id,
                GuestVersionViewRow.version_id,
            ],
            set_={"viewed_at": viewed_at},
        )
        self.session.execute(statement)

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

    @staticmethod
    def _version(row: SpecificationVersionRow) -> SpecificationVersion:
        return SpecificationVersion(
            id=row.id,
            workspace_id=row.workspace_id,
            number=row.number,
            previous_version_id=row.previous_version_id,
            snapshot=row.snapshot,
            content_hash=row.content_hash,
            schema_version=row.schema_version,
            created_by=row.created_by,
            created_at=row.created_at,
        )

    @staticmethod
    def _review_round(row: ReviewRoundRow) -> ReviewRound:
        return ReviewRound(
            id=row.id,
            workspace_id=row.workspace_id,
            version_id=row.version_id,
            status=ReviewRoundStatus(row.status),
            opened_at=row.opened_at,
            closed_at=row.closed_at,
            decided_by=row.decided_by,
            decision_note=row.decision_note,
        )
