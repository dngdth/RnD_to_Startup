from datetime import datetime
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from proofprint.domain.entities.collaboration import (
    ChangeRequest,
    ChangeRequestStatus,
    Comment,
)
from proofprint.domain.entities.identity import SystemRole
from proofprint.domain.entities.version import (
    ReviewRound,
    ReviewRoundStatus,
    SpecificationVersion,
)
from proofprint.domain.entities.workspace import WorkspaceGrant, WorkspaceSummary
from proofprint.infrastructure.models import (
    AuditEventRow,
    ChangeRequestRow,
    CommentRow,
    CustomerRow,
    GuestVersionViewRow,
    IdempotencyRecordRow,
    OutboxMessageRow,
    ReviewRoundRow,
    SpecificationVersionRow,
    WorkspaceMembershipRow,
    WorkspaceRow,
)


class SqlAlchemyCollaborationRepository:
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

    def get_version(
        self, workspace_id: UUID, version_id: UUID
    ) -> SpecificationVersion | None:
        statement = select(SpecificationVersionRow).where(
            SpecificationVersionRow.id == version_id,
            SpecificationVersionRow.workspace_id == workspace_id,
        )
        row = self.session.scalar(statement)
        return self._version(row) if row is not None else None

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

    def add_comment(self, comment: Comment) -> None:
        self.session.add(
            CommentRow(
                id=comment.id,
                workspace_id=comment.workspace_id,
                version_id=comment.version_id,
                block_id=comment.block_id,
                change_request_id=comment.change_request_id,
                request_batch_id=comment.request_batch_id,
                resolved_in_version_id=comment.resolved_in_version_id,
                body=comment.body,
                author_id=comment.author_id,
                guest_session_id=comment.guest_session_id,
                author_username_snapshot=comment.author_username_snapshot,
                created_at=comment.created_at,
            )
        )
        self.session.flush()

    def list_comments(
        self,
        workspace_id: UUID,
        *,
        version_id: UUID | None = None,
        block_id: UUID | None = None,
        change_request_id: UUID | None = None,
    ) -> list[Comment]:
        statement = select(CommentRow).where(CommentRow.workspace_id == workspace_id)
        if version_id is not None:
            statement = statement.where(CommentRow.version_id == version_id)
        if block_id is not None:
            statement = statement.where(CommentRow.block_id == block_id)
        if change_request_id is not None:
            statement = statement.where(CommentRow.change_request_id == change_request_id)
        statement = statement.order_by(CommentRow.created_at, CommentRow.id)
        return [self._comment(row) for row in self.session.scalars(statement)]

    def add_change_request(self, change_request: ChangeRequest) -> None:
        self.session.add(
            ChangeRequestRow(
                id=change_request.id,
                workspace_id=change_request.workspace_id,
                review_round_id=change_request.review_round_id,
                version_id=change_request.version_id,
                block_id=change_request.block_id,
                field_path=change_request.field_path,
                message=change_request.message,
                status=change_request.status.value,
                requested_by=change_request.requested_by,
                requested_by_guest_session_id=(
                    change_request.requested_by_guest_session_id
                ),
                requester_username_snapshot=change_request.requester_username_snapshot,
                acknowledged_by=change_request.acknowledged_by,
                resolved_in_version_id=change_request.resolved_in_version_id,
                parent_change_request_id=change_request.parent_change_request_id,
                resolution_note=change_request.resolution_note,
                created_at=change_request.created_at,
                updated_at=change_request.updated_at,
            )
        )
        self.session.flush()

    def list_change_requests(self, workspace_id: UUID) -> list[ChangeRequest]:
        statement = (
            select(ChangeRequestRow)
            .where(ChangeRequestRow.workspace_id == workspace_id)
            .order_by(ChangeRequestRow.created_at, ChangeRequestRow.id)
        )
        return [self._change_request(row) for row in self.session.scalars(statement)]

    def get_change_request(self, change_request_id: UUID) -> ChangeRequest | None:
        row = self.session.get(ChangeRequestRow, change_request_id)
        return self._change_request(row) if row is not None else None

    def get_change_request_for_update(
        self, change_request_id: UUID
    ) -> ChangeRequest | None:
        statement = (
            select(ChangeRequestRow)
            .where(ChangeRequestRow.id == change_request_id)
            .with_for_update()
        )
        row = self.session.scalar(statement)
        return self._change_request(row) if row is not None else None

    def update_change_request(
        self,
        change_request_id: UUID,
        *,
        status: ChangeRequestStatus,
        updated_at: datetime,
        acknowledged_by: UUID | None = None,
        resolved_in_version_id: UUID | None = None,
        resolution_note: str | None = None,
    ) -> None:
        row = self.session.get(ChangeRequestRow, change_request_id)
        if row is None:
            return
        row.status = status.value
        row.updated_at = updated_at
        if acknowledged_by is not None:
            row.acknowledged_by = acknowledged_by
        if resolved_in_version_id is not None:
            row.resolved_in_version_id = resolved_in_version_id
        if resolution_note is not None:
            row.resolution_note = resolution_note
        self.session.flush()

    def count_change_requests(
        self,
        review_round_id: UUID,
        *,
        status: ChangeRequestStatus,
    ) -> int:
        statement = select(func.count()).select_from(ChangeRequestRow).where(
            ChangeRequestRow.review_round_id == review_round_id,
            ChangeRequestRow.status == status.value,
        )
        return int(self.session.scalar(statement) or 0)

    def has_guest_viewed_version(self, guest_session_id: UUID, version_id: UUID) -> bool:
        statement = select(GuestVersionViewRow.guest_session_id).where(
            GuestVersionViewRow.guest_session_id == guest_session_id,
            GuestVersionViewRow.version_id == version_id,
        )
        return self.session.scalar(statement) is not None

    def bump_workspace_revision(
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

    def close_review_round_for_changes(
        self,
        review_round_id: UUID,
        *,
        closed_at: datetime,
        decision_note: str | None,
    ) -> None:
        row = self.session.get(ReviewRoundRow, review_round_id)
        if row is None:
            return
        row.status = ReviewRoundStatus.CHANGES_REQUESTED.value
        row.closed_at = closed_at
        row.decision_note = decision_note
        self.session.flush()

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
                actor_id=actor_id,
                guest_session_id=guest_session_id,
                actor_username_snapshot=actor_username_snapshot,
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
                id=uuid4(), event_type=event_type, payload=payload, status="PENDING"
            )
        )

    def get_guest_idempotent_result(
        self,
        *,
        guest_session_id: UUID,
        workspace_id: UUID,
        operation: str,
        idempotency_key: str,
    ) -> tuple[str, dict[str, Any]] | None:
        statement = select(IdempotencyRecordRow).where(
            IdempotencyRecordRow.guest_session_id == guest_session_id,
            IdempotencyRecordRow.workspace_id == workspace_id,
            IdempotencyRecordRow.operation == operation,
            IdempotencyRecordRow.idempotency_key == idempotency_key,
        )
        row = self.session.scalar(statement)
        if row is None:
            return None
        return row.request_fingerprint, row.response_payload

    def add_guest_idempotent_result(
        self,
        *,
        guest_session_id: UUID,
        workspace_id: UUID,
        operation: str,
        idempotency_key: str,
        request_fingerprint: str,
        response_payload: dict[str, Any],
    ) -> None:
        self.session.add(
            IdempotencyRecordRow(
                id=uuid4(),
                actor_id=None,
                guest_session_id=guest_session_id,
                workspace_id=workspace_id,
                operation=operation,
                idempotency_key=idempotency_key,
                request_fingerprint=request_fingerprint,
                response_payload=response_payload,
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

    @staticmethod
    def _comment(row: CommentRow) -> Comment:
        return Comment(
            id=row.id,
            workspace_id=row.workspace_id,
            version_id=row.version_id,
            block_id=row.block_id,
            change_request_id=row.change_request_id,
            request_batch_id=row.request_batch_id,
            resolved_in_version_id=row.resolved_in_version_id,
            body=row.body,
            author_id=row.author_id,
            guest_session_id=row.guest_session_id,
            author_username_snapshot=row.author_username_snapshot,
            created_at=row.created_at,
        )

    @staticmethod
    def _change_request(row: ChangeRequestRow) -> ChangeRequest:
        return ChangeRequest(
            id=row.id,
            workspace_id=row.workspace_id,
            review_round_id=row.review_round_id,
            version_id=row.version_id,
            block_id=row.block_id,
            field_path=row.field_path,
            message=row.message,
            status=ChangeRequestStatus(row.status),
            requested_by=row.requested_by,
            requested_by_guest_session_id=row.requested_by_guest_session_id,
            requester_username_snapshot=row.requester_username_snapshot,
            acknowledged_by=row.acknowledged_by,
            resolved_in_version_id=row.resolved_in_version_id,
            parent_change_request_id=row.parent_change_request_id,
            resolution_note=row.resolution_note,
            created_at=row.created_at,
            updated_at=row.updated_at,
        )
