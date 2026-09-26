from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from proofprint.domain.entities.identity import SystemRole
from proofprint.domain.entities.workspace import WorkspaceGrant, WorkspaceSummary
from proofprint.infrastructure.models import CustomerRow, WorkspaceMembershipRow, WorkspaceRow


class SqlAlchemyWorkspaceAccessRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def list_visible_to(self, user_id: UUID) -> list[WorkspaceSummary]:
        statement = (
            select(WorkspaceRow, CustomerRow)
            .join(
                WorkspaceMembershipRow,
                WorkspaceMembershipRow.workspace_id == WorkspaceRow.id,
            )
            .join(CustomerRow, CustomerRow.id == WorkspaceRow.customer_id)
            .where(
                WorkspaceMembershipRow.user_id == user_id,
                WorkspaceMembershipRow.status == "ACTIVE",
                WorkspaceMembershipRow.can_view.is_(True),
            )
            .order_by(WorkspaceRow.updated_at.desc(), WorkspaceRow.id)
        )
        return [self._summary(workspace, customer) for workspace, customer in self.session.execute(statement)]

    def get(self, workspace_id: UUID) -> WorkspaceSummary | None:
        statement = (
            select(WorkspaceRow, CustomerRow)
            .join(CustomerRow, CustomerRow.id == WorkspaceRow.customer_id)
            .where(WorkspaceRow.id == workspace_id)
        )
        row = self.session.execute(statement).one_or_none()
        return self._summary(*row) if row is not None else None

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

    @staticmethod
    def _summary(row: WorkspaceRow, customer: CustomerRow) -> WorkspaceSummary:
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
