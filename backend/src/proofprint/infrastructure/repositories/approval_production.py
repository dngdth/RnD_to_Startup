from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import select

from proofprint.domain.entities.approval_production import Approval
from proofprint.domain.entities.collaboration import ChangeRequest, ChangeRequestStatus
from proofprint.domain.entities.version import ReviewRoundStatus
from proofprint.infrastructure.models.event import AuditEventRow, OutboxMessageRow
from proofprint.infrastructure.models.idempotency import IdempotencyRecordRow
from proofprint.infrastructure.models.review import ApprovalRow, ChangeRequestRow, ReviewRoundRow
from proofprint.infrastructure.models.workspace import WorkspaceRow
from proofprint.infrastructure.repositories.collaboration import (
    SqlAlchemyCollaborationRepository,
)


class SqlAlchemyApprovalProductionRepository(SqlAlchemyCollaborationRepository):
    def list_change_requests_for_update(self, workspace_id: UUID) -> list[ChangeRequest]:
        statement = (
            select(ChangeRequestRow)
            .where(ChangeRequestRow.workspace_id == workspace_id)
            .order_by(ChangeRequestRow.id)
            .with_for_update()
        )
        return [self._change_request(row) for row in self.session.scalars(statement)]

    def update_change_request_status(
        self, change_request_id: UUID, status: ChangeRequestStatus, updated_at: datetime
    ) -> None:
        row = self.session.get(ChangeRequestRow, change_request_id)
        if row is None:
            raise RuntimeError("Locked change request disappeared")
        row.status = status.value
        row.updated_at = updated_at

    def get_approval_for_version(
        self, workspace_id: UUID, version_id: UUID
    ) -> Approval | None:
        row = self.session.scalar(
            select(ApprovalRow).where(
                ApprovalRow.workspace_id == workspace_id,
                ApprovalRow.version_id == version_id,
            )
        )
        return self._approval(row) if row is not None else None

    def add_approval(self, approval: Approval) -> None:
        self.session.add(
            ApprovalRow(
                id=approval.id,
                workspace_id=approval.workspace_id,
                review_round_id=approval.review_round_id,
                version_id=approval.version_id,
                approver_id=None,
                guest_session_id=approval.guest_session_id,
                reviewer_username_snapshot=approval.reviewer_username_snapshot,
                review_link_version=approval.review_link_version,
                created_at=approval.created_at,
            )
        )
        self.session.flush()

    def close_review_round_approved(self, review_round_id: UUID, closed_at: datetime) -> None:
        row = self.session.get(ReviewRoundRow, review_round_id)
        if row is None:
            raise RuntimeError("Locked review round disappeared")
        row.status = ReviewRoundStatus.APPROVED.value
        row.closed_at = closed_at
        self.session.flush()

    def mark_workspace_approved(
        self, workspace_id: UUID, version_id: UUID, revision: int, updated_at: datetime
    ) -> None:
        row = self.session.get(WorkspaceRow, workspace_id)
        if row is None:
            raise RuntimeError("Locked workspace disappeared")
        row.workflow_status = "APPROVED"
        row.approved_version_id = version_id
        row.revision = revision
        row.updated_at = updated_at
        self.session.flush()

    def mark_workspace_production_locked(
        self, workspace_id: UUID, version_id: UUID, revision: int, updated_at: datetime
    ) -> None:
        row = self.session.get(WorkspaceRow, workspace_id)
        if row is None:
            raise RuntimeError("Locked workspace disappeared")
        row.workflow_status = "LOCKED_FOR_PRODUCTION"
        row.production_version_id = version_id
        row.revision = revision
        row.updated_at = updated_at
        self.session.flush()

    def get_idempotent_result(
        self,
        *,
        actor_id: UUID | None,
        guest_session_id: UUID | None,
        workspace_id: UUID,
        operation: str,
        idempotency_key: str,
    ) -> tuple[str, dict[str, Any]] | None:
        statement = select(IdempotencyRecordRow).where(
            IdempotencyRecordRow.actor_id == actor_id,
            IdempotencyRecordRow.guest_session_id == guest_session_id,
            IdempotencyRecordRow.workspace_id == workspace_id,
            IdempotencyRecordRow.operation == operation,
            IdempotencyRecordRow.idempotency_key == idempotency_key,
        )
        row = self.session.scalar(statement)
        return (row.request_fingerprint, row.response_payload) if row is not None else None

    def add_idempotent_result(
        self,
        *,
        actor_id: UUID | None,
        guest_session_id: UUID | None,
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
                guest_session_id=guest_session_id,
                workspace_id=workspace_id,
                operation=operation,
                idempotency_key=idempotency_key,
                request_fingerprint=request_fingerprint,
                response_payload=response_payload,
            )
        )

    def add_audit_event(
        self,
        *,
        workspace_id: UUID,
        event_type: str,
        entity_type: str,
        entity_id: UUID,
        actor_id: UUID | None = None,
        guest_session_id: UUID | None = None,
        actor_username_snapshot: str | None = None,
        version_id: UUID | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> None:
        self.session.add(
            AuditEventRow(
                id=uuid4(),
                workspace_id=workspace_id,
                event_type=event_type,
                entity_type=entity_type,
                entity_id=entity_id,
                actor_id=actor_id,
                guest_session_id=guest_session_id,
                actor_username_snapshot=actor_username_snapshot,
                version_id=version_id,
                metadata_json=metadata or {},
            )
        )

    def add_outbox_message(self, event_type: str, payload: dict[str, Any]) -> None:
        self.session.add(
            OutboxMessageRow(id=uuid4(), event_type=event_type, payload=payload, status="PENDING")
        )

    @staticmethod
    def _approval(row: ApprovalRow) -> Approval:
        if (
            row.guest_session_id is None
            or row.reviewer_username_snapshot is None
            or row.review_link_version is None
        ):
            raise RuntimeError("Approval is missing its guest reviewer snapshot")
        return Approval(
            id=row.id,
            workspace_id=row.workspace_id,
            review_round_id=row.review_round_id,
            version_id=row.version_id,
            guest_session_id=row.guest_session_id,
            reviewer_username_snapshot=row.reviewer_username_snapshot,
            review_link_version=row.review_link_version,
            created_at=row.created_at,
        )
