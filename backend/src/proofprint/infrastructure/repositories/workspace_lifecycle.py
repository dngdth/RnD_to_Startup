from datetime import datetime
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from proofprint.domain.entities.identity import SystemRole
from proofprint.domain.entities.workspace import WorkspaceGrant, WorkspaceSummary
from proofprint.domain.entities.workspace_lifecycle import WorkspaceAuditEvent, WorkspaceAuditPage
from proofprint.infrastructure.models import (
    AuditEventRow,
    CustomerRow,
    OutboxMessageRow,
    WorkspaceMembershipRow,
    WorkspaceRow,
)


class SqlAlchemyWorkspaceLifecycleRepository:
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

    def get_workspace_owner_id(self, workspace_id: UUID) -> UUID | None:
        return self.session.scalar(
            select(WorkspaceRow.created_by).where(WorkspaceRow.id == workspace_id)
        )

    def list_audit_events(
        self,
        workspace_id: UUID,
        *,
        limit: int,
        offset: int,
        event_type: str | None,
        entity_type: str | None,
        actor_id: UUID | None,
        guest_session_id: UUID | None,
        created_from: datetime | None,
        created_to: datetime | None,
    ) -> WorkspaceAuditPage:
        criteria = [AuditEventRow.workspace_id == workspace_id]
        if event_type is not None:
            criteria.append(AuditEventRow.event_type == event_type)
        if entity_type is not None:
            criteria.append(AuditEventRow.entity_type == entity_type)
        if actor_id is not None:
            criteria.append(AuditEventRow.actor_id == actor_id)
        if guest_session_id is not None:
            criteria.append(AuditEventRow.guest_session_id == guest_session_id)
        if created_from is not None:
            criteria.append(AuditEventRow.created_at >= created_from)
        if created_to is not None:
            criteria.append(AuditEventRow.created_at <= created_to)
        total = self.session.scalar(select(func.count()).select_from(AuditEventRow).where(*criteria))
        statement = (
            select(AuditEventRow)
            .where(*criteria)
            .order_by(AuditEventRow.created_at.desc(), AuditEventRow.id.desc())
            .offset(offset)
            .limit(limit)
        )
        return WorkspaceAuditPage(
            items=[self._audit_event(row) for row in self.session.scalars(statement)],
            total=total or 0,
            limit=limit,
            offset=offset,
        )

    def update_record_status(
        self,
        workspace_id: UUID,
        *,
        record_status: str,
        revision: int,
        updated_at: datetime,
    ) -> None:
        row = self.session.get(WorkspaceRow, workspace_id)
        if row is None:
            return
        row.record_status = record_status
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
        metadata: dict[str, Any],
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
                metadata_json=metadata,
            )
        )

    def add_outbox_message(self, event_type: str, payload: dict[str, Any]) -> None:
        self.session.add(
            OutboxMessageRow(
                id=uuid4(), event_type=event_type, payload=payload, status="PENDING"
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
        )

    @staticmethod
    def _audit_event(row: AuditEventRow) -> WorkspaceAuditEvent:
        return WorkspaceAuditEvent(
            id=row.id,
            workspace_id=row.workspace_id,
            actor_id=row.actor_id,
            guest_session_id=row.guest_session_id,
            actor_username_snapshot=row.actor_username_snapshot,
            event_type=row.event_type,
            entity_type=row.entity_type,
            entity_id=row.entity_id,
            version_id=row.version_id,
            metadata=row.metadata_json,
            created_at=row.created_at,
        )
