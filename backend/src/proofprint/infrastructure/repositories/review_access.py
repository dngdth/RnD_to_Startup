from datetime import datetime
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import select, text, update
from sqlalchemy.orm import Session

from proofprint.domain.entities.draft import SpecificationBlock
from proofprint.domain.entities.identity import SystemRole
from proofprint.domain.entities.review_access import (
    GuestSessionStatus,
    ReviewLinkStatus,
    WorkspaceGuestSession,
    WorkspaceReviewLink,
)
from proofprint.domain.entities.workspace import WorkspaceCustomer, WorkspaceGrant, WorkspaceSummary
from proofprint.infrastructure.models import (
    AuditEventRow,
    CustomerRow,
    OutboxMessageRow,
    SpecificationBlockRow,
    WorkspaceCreationRequestRow,
    WorkspaceGuestSessionRow,
    WorkspaceMembershipRow,
    WorkspaceReviewLinkRow,
    WorkspaceRow,
)


class SqlAlchemyWorkspaceCommandRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def get_creation_request(
        self, actor_id: UUID, key: str
    ) -> tuple[str, dict[str, Any]] | None:
        # Serialize requests with the same actor/key before checking for a replay.
        self.session.execute(
            text("SELECT pg_advisory_xact_lock(hashtextextended(:scope, 0))"),
            {"scope": f"workspace-create:{actor_id}:{key}"},
        )
        row = self.session.scalar(
            select(WorkspaceCreationRequestRow).where(
                WorkspaceCreationRequestRow.actor_id == actor_id,
                WorkspaceCreationRequestRow.idempotency_key == key,
            )
        )
        return (row.request_fingerprint, row.response_payload) if row else None

    def add_creation_request(
        self, actor_id: UUID, key: str, fingerprint: str, payload: dict[str, Any]
    ) -> None:
        self.session.add(
            WorkspaceCreationRequestRow(
                id=uuid4(), actor_id=actor_id, idempotency_key=key,
                request_fingerprint=fingerprint, response_payload=payload,
            )
        )

    def add_customer(self, customer: WorkspaceCustomer, created_by: UUID) -> None:
        self.session.add(
            CustomerRow(
                id=customer.id,
                name=customer.name,
                code=f"customer-{customer.id.hex}",
                status="ACTIVE",
                email=customer.email,
                phone=customer.phone,
                created_by=created_by,
            )
        )
        self.session.flush()

    def find_customer_by_phone(
        self, created_by: UUID, phone: str
    ) -> WorkspaceCustomer | None:
        row = self.session.scalar(
            select(CustomerRow).where(
                CustomerRow.created_by == created_by,
                CustomerRow.phone == phone,
                CustomerRow.status == "ACTIVE",
            ).order_by(CustomerRow.created_at, CustomerRow.id).limit(1)
        )
        if row is None:
            return None
        return WorkspaceCustomer(row.id, row.name, row.email, row.phone)

    def add_workspace(self, workspace: WorkspaceSummary, created_by: UUID) -> None:
        self.session.add(
            WorkspaceRow(
                id=workspace.id,
                customer_id=workspace.customer_id,
                assigned_designer_id=workspace.assigned_designer_id or created_by,
                product_type=workspace.product_type,
                workflow_status=workspace.workflow_status,
                record_status=workspace.record_status,
                latest_version_id=workspace.latest_version_id,
                approved_version_id=workspace.approved_version_id,
                production_version_id=workspace.production_version_id,
                revision=workspace.revision,
                created_by=created_by,
                created_at=workspace.updated_at,
                updated_at=workspace.updated_at,
            )
        )
        self.session.flush()

    def add_initial_block(self, block: SpecificationBlock) -> None:
        self.session.add(
            SpecificationBlockRow(
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
        )

    def add_membership(self, user_id: UUID, grant: WorkspaceGrant) -> None:
        self.session.add(
            WorkspaceMembershipRow(
                workspace_id=grant.workspace_id,
                user_id=user_id,
                role=grant.role.value,
                can_view=grant.can_view,
                can_edit=grant.can_edit,
                can_review=grant.can_review,
                can_approve=grant.can_approve,
                can_lock_production=grant.can_lock_production,
                status="ACTIVE",
            )
        )

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

    def get_workspace_state_for_update(self, workspace_id: UUID) -> tuple[int, str] | None:
        row = self.session.scalar(
            select(WorkspaceRow).where(WorkspaceRow.id == workspace_id).with_for_update()
        )
        return (row.revision, row.record_status) if row is not None else None

    def update_workspace_revision(
        self, workspace_id: UUID, revision: int, updated_at: datetime
    ) -> None:
        row = self.session.get(WorkspaceRow, workspace_id)
        if row is not None:
            row.revision = revision
            row.updated_at = updated_at

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
                version_id=None,
                metadata_json=metadata or {},
            )
        )

    def add_outbox_message(self, event_type: str, payload: dict[str, Any]) -> None:
        self.session.add(
            OutboxMessageRow(
                id=uuid4(), event_type=event_type, payload=payload, status="PENDING"
            )
        )


class SqlAlchemyReviewAccessRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def add_link(self, link: WorkspaceReviewLink) -> None:
        self.session.add(
            WorkspaceReviewLinkRow(
                id=link.id,
                workspace_id=link.workspace_id,
                version=link.version,
                status=link.status.value,
                created_by=link.created_by,
                created_at=link.created_at,
                disabled_by=link.disabled_by,
                disabled_at=link.disabled_at,
                disabled_reason=link.disabled_reason,
                replaced_by_link_id=link.replaced_by_link_id,
            )
        )
        self.session.flush()

    def get_link(self, link_id: UUID) -> WorkspaceReviewLink | None:
        row = self.session.get(WorkspaceReviewLinkRow, link_id)
        return self._link(row) if row is not None else None

    def get_active_link(self, workspace_id: UUID) -> WorkspaceReviewLink | None:
        statement = select(WorkspaceReviewLinkRow).where(
            WorkspaceReviewLinkRow.workspace_id == workspace_id,
            WorkspaceReviewLinkRow.status == "ACTIVE",
        )
        row = self.session.scalar(statement)
        return self._link(row) if row is not None else None

    def get_active_link_for_update(self, workspace_id: UUID) -> WorkspaceReviewLink | None:
        statement = (
            select(WorkspaceReviewLinkRow)
            .where(
                WorkspaceReviewLinkRow.workspace_id == workspace_id,
                WorkspaceReviewLinkRow.status == "ACTIVE",
            )
            .with_for_update()
        )
        row = self.session.scalar(statement)
        return self._link(row) if row is not None else None

    def disable_link(
        self,
        link_id: UUID,
        *,
        disabled_by: UUID,
        disabled_at: datetime,
        reason: str,
        replaced_by_link_id: UUID | None = None,
    ) -> None:
        row = self.session.get(WorkspaceReviewLinkRow, link_id)
        if row is None:
            return
        row.status = "DISABLED"
        row.disabled_by = disabled_by
        row.disabled_at = disabled_at
        row.disabled_reason = reason
        row.replaced_by_link_id = replaced_by_link_id
        self.session.flush()

    def set_replacement(self, link_id: UUID, replacement_link_id: UUID) -> None:
        row = self.session.get(WorkspaceReviewLinkRow, link_id)
        if row is not None:
            row.replaced_by_link_id = replacement_link_id

    def revoke_sessions_for_link(self, link_id: UUID, revoked_at: datetime) -> int:
        statement = (
            update(WorkspaceGuestSessionRow)
            .where(
                WorkspaceGuestSessionRow.review_link_id == link_id,
                WorkspaceGuestSessionRow.status == "ACTIVE",
            )
            .values(status="REVOKED", revoked_at=revoked_at)
        )
        result = self.session.execute(statement)
        return result.rowcount

    def revoke_session(self, session_id: UUID, revoked_at: datetime) -> None:
        self.session.execute(
            update(WorkspaceGuestSessionRow)
            .where(
                WorkspaceGuestSessionRow.id == session_id,
                WorkspaceGuestSessionRow.status == "ACTIVE",
            )
            .values(status="REVOKED", revoked_at=revoked_at)
        )

    def add_guest_session(self, session: WorkspaceGuestSession) -> None:
        self.session.add(
            WorkspaceGuestSessionRow(
                id=session.id,
                review_link_id=session.review_link_id,
                workspace_id=session.workspace_id,
                username=session.username,
                token_hash=session.token_hash,
                status=session.status.value,
                created_at=session.created_at,
                expires_at=session.expires_at,
                revoked_at=session.revoked_at,
            )
        )
        self.session.flush()

    def get_guest_session_by_token_hash(
        self, token_hash: str
    ) -> WorkspaceGuestSession | None:
        statement = select(WorkspaceGuestSessionRow).where(
            WorkspaceGuestSessionRow.token_hash == token_hash
        )
        row = self.session.scalar(statement)
        if row is None:
            return None
        return WorkspaceGuestSession(
            id=row.id,
            review_link_id=row.review_link_id,
            workspace_id=row.workspace_id,
            username=row.username,
            token_hash=row.token_hash,
            status=GuestSessionStatus(row.status),
            created_at=row.created_at,
            expires_at=row.expires_at,
            revoked_at=row.revoked_at,
        )

    @staticmethod
    def _link(row: WorkspaceReviewLinkRow) -> WorkspaceReviewLink:
        return WorkspaceReviewLink(
            id=row.id,
            workspace_id=row.workspace_id,
            version=row.version,
            status=ReviewLinkStatus(row.status),
            created_by=row.created_by,
            created_at=row.created_at,
            disabled_by=row.disabled_by,
            disabled_at=row.disabled_at,
            disabled_reason=row.disabled_reason,
            replaced_by_link_id=row.replaced_by_link_id,
        )
