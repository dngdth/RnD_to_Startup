from datetime import UTC, datetime
from uuid import uuid4

from proofprint.application.dtos import ReviewLinkView, WorkspaceCreated
from proofprint.domain.entities.identity import CurrentActor, SystemRole
from proofprint.domain.entities.review_access import ReviewLinkStatus, WorkspaceReviewLink
from proofprint.domain.entities.workspace import WorkspaceCustomer, WorkspaceGrant, WorkspaceSummary
from proofprint.domain.exceptions import PermissionDenied
from proofprint.domain.interfaces.review_access import (
    ReviewAccessRepository,
    ReviewLinkTokenCodec,
    UnitOfWork,
    WorkspaceCommandRepository,
)


class CreateWorkspace:
    def __init__(
        self,
        commands: WorkspaceCommandRepository,
        review_access: ReviewAccessRepository,
        links: ReviewLinkTokenCodec,
        unit_of_work: UnitOfWork,
        review_base_url: str,
    ) -> None:
        self.commands = commands
        self.review_access = review_access
        self.links = links
        self.unit_of_work = unit_of_work
        self.review_base_url = review_base_url.rstrip("/")

    def execute(
        self,
        *,
        actor: CurrentActor,
        customer_name: str,
        customer_email: str | None,
        customer_phone: str | None,
        product_type: str,
    ) -> WorkspaceCreated:
        if actor.system_role != SystemRole.DESIGNER:
            raise PermissionDenied("Only a designer can create a workspace")

        now = datetime.now(UTC)
        customer = WorkspaceCustomer(
            id=uuid4(),
            name=customer_name.strip(),
            email=customer_email.strip().lower() if customer_email else None,
            phone=customer_phone.strip() if customer_phone else None,
        )
        workspace = WorkspaceSummary(
            id=uuid4(),
            customer_id=customer.id,
            customer_name=customer.name,
            customer_email=customer.email,
            customer_phone=customer.phone,
            product_type=product_type.strip(),
            workflow_status="DRAFT",
            record_status="ACTIVE",
            latest_version_id=None,
            approved_version_id=None,
            production_version_id=None,
            revision=0,
            updated_at=now,
        )
        link = WorkspaceReviewLink(
            id=uuid4(),
            workspace_id=workspace.id,
            version=1,
            status=ReviewLinkStatus.ACTIVE,
            created_by=actor.id,
            created_at=now,
        )

        try:
            self.commands.add_customer(customer, actor.id)
            self.commands.add_workspace(workspace, actor.id)
            self.commands.add_membership(
                actor.id,
                WorkspaceGrant(
                    workspace_id=workspace.id,
                    role=SystemRole.DESIGNER,
                    can_view=True,
                    can_edit=True,
                    can_review=False,
                    can_approve=False,
                    can_lock_production=True,
                ),
            )
            self.review_access.add_link(link)
            self.commands.add_audit_event(
                workspace_id=workspace.id,
                actor_id=actor.id,
                event_type="WORKSPACE_CREATED",
                entity_type="OrderWorkspace",
                entity_id=workspace.id,
                metadata={"customer_id": str(customer.id), "customer_name": customer.name},
            )
            self.commands.add_audit_event(
                workspace_id=workspace.id,
                actor_id=actor.id,
                event_type="REVIEW_LINK_CREATED",
                entity_type="WorkspaceReviewLink",
                entity_id=link.id,
                metadata={"link_version": link.version},
            )
            self.unit_of_work.commit()
        except Exception:
            self.unit_of_work.rollback()
            raise

        token = self.links.issue(link)
        return WorkspaceCreated(
            workspace=workspace,
            review_link=ReviewLinkView(
                link=link, review_url=f"{self.review_base_url}/review/{token}"
            ),
        )
