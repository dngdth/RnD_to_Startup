import hashlib
import json
from dataclasses import asdict, dataclass
from datetime import UTC, datetime
from enum import Enum
from typing import Any
from uuid import UUID, uuid4

from proofprint.application.dtos import ReviewLinkView, WorkspaceCreated
from proofprint.domain.entities.draft import BlockType, SpecificationBlock, validate_block_content
from proofprint.domain.entities.identity import CurrentActor, SystemRole
from proofprint.domain.entities.review_access import ReviewLinkStatus, WorkspaceReviewLink
from proofprint.domain.entities.workspace import WorkspaceCustomer, WorkspaceGrant, WorkspaceSummary
from proofprint.domain.exceptions import Conflict, PermissionDenied, ValidationFailed
from proofprint.domain.interfaces.review_access import (
    ReviewAccessRepository,
    ReviewLinkTokenCodec,
    UnitOfWork,
    WorkspaceCommandRepository,
)
from proofprint.domain.phone_numbers import normalize_vietnamese_phone


@dataclass(frozen=True, slots=True)
class InitialBlockInput:
    block_type: BlockType
    label: str
    content: dict[str, Any]


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
        idempotency_key: str,
        initial_blocks: list[InitialBlockInput] | None = None,
    ) -> WorkspaceCreated:
        if actor.system_role != SystemRole.DESIGNER:
            raise PermissionDenied("Only a designer can create a workspace")

        key = idempotency_key.strip()
        if not key or len(key) > 200:
            raise ValidationFailed("Idempotency-Key must contain 1 to 200 characters")
        normalized = {
            "customer_name": customer_name.strip(),
            "customer_email": customer_email.strip().lower() if customer_email else None,
            "customer_phone": (
                normalize_vietnamese_phone(customer_phone) if customer_phone else None
            ),
            "product_type": product_type.strip(),
            "initial_blocks": [
                {
                    "block_type": item.block_type.value,
                    "label": item.label.strip(),
                    "content": item.content,
                }
                for item in (initial_blocks or [])
            ],
        }
        if len(normalized["initial_blocks"]) > 30:
            raise ValidationFailed("A workspace can start with at most 30 specification blocks")
        for item in normalized["initial_blocks"]:
            if not item["label"] or len(item["label"]) > 200:
                raise ValidationFailed("Each specification block needs a label of 1 to 200 characters")
            if item["block_type"] in {BlockType.IMAGE.value, BlockType.FILE.value}:
                raise ValidationFailed("Upload image and file assets after creating the workspace")
            validate_block_content(BlockType(item["block_type"]), item["content"])
        fingerprint = hashlib.sha256(
            json.dumps(normalized, sort_keys=True, ensure_ascii=False).encode("utf-8")
        ).hexdigest()
        replay = self.commands.get_creation_request(actor.id, key)
        if replay is not None:
            stored_fingerprint, payload = replay
            if stored_fingerprint != fingerprint:
                raise Conflict("Idempotency-Key was already used with another request")
            return _created_from_payload(payload, actor.id)

        now = datetime.now(UTC)
        customer = (
            self.commands.find_customer_by_phone(actor.id, normalized["customer_phone"])
            if normalized["customer_phone"]
            else None
        )
        is_new_customer = customer is None
        if customer is None:
            customer = WorkspaceCustomer(
                id=uuid4(),
                name=normalized["customer_name"],
                email=normalized["customer_email"],
                phone=normalized["customer_phone"],
            )
        workspace = WorkspaceSummary(
            id=uuid4(),
            customer_id=customer.id,
            customer_name=customer.name,
            customer_email=customer.email,
            customer_phone=customer.phone,
            product_type=normalized["product_type"],
            workflow_status="DRAFT",
            record_status="ACTIVE",
            latest_version_id=None,
            approved_version_id=None,
            production_version_id=None,
            revision=0,
            updated_at=now,
            assigned_designer_id=actor.id,
        )
        link = WorkspaceReviewLink(
            id=uuid4(),
            workspace_id=workspace.id,
            version=1,
            status=ReviewLinkStatus.ACTIVE,
            created_by=actor.id,
            created_at=now,
        )
        created = WorkspaceCreated(
            workspace=workspace,
            review_link=ReviewLinkView(
                link=link, review_url=f"{self.review_base_url}/review/{self.links.issue(link)}"
            ),
        )

        try:
            if is_new_customer:
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
            for position, item in enumerate(normalized["initial_blocks"]):
                block = SpecificationBlock(
                    id=uuid4(), workspace_id=workspace.id,
                    block_type=BlockType(item["block_type"]),
                    label=item["label"], content=item["content"],
                    position=position, schema_version=1,
                    created_by=actor.id, updated_by=actor.id,
                    created_at=now, updated_at=now,
                )
                self.commands.add_initial_block(block)
                self.commands.add_audit_event(
                    workspace_id=workspace.id, actor_id=actor.id,
                    event_type="INITIAL_BLOCK_CREATED",
                    entity_type="SpecificationBlock", entity_id=block.id,
                    metadata={"block_type": block.block_type.value, "position": position},
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
                event_type="MEMBER_ADDED",
                entity_type="WorkspaceMembership",
                entity_id=actor.id,
                metadata={"role": "DESIGNER", "created_with_workspace": True},
            )
            self.commands.add_audit_event(
                workspace_id=workspace.id,
                actor_id=actor.id,
                event_type="REVIEW_LINK_CREATED",
                entity_type="WorkspaceReviewLink",
                entity_id=link.id,
                metadata={"link_version": link.version},
            )
            self.commands.add_outbox_message(
                "WORKSPACE_CREATED", {"workspace_id": str(workspace.id)}
            )
            self.commands.add_creation_request(
                actor.id, key, fingerprint, _jsonable(asdict(created))
            )
            self.unit_of_work.commit()
        except Exception:
            self.unit_of_work.rollback()
            raise

        return created


def _jsonable(value: Any) -> Any:
    if isinstance(value, UUID | datetime | Enum):
        return value.value if isinstance(value, Enum) else str(value)
    if isinstance(value, dict):
        return {key: _jsonable(item) for key, item in value.items()}
    if isinstance(value, list):
        return [_jsonable(item) for item in value]
    return value


def _created_from_payload(payload: dict[str, Any], actor_id: UUID) -> WorkspaceCreated:
    data = payload["workspace"]
    workspace = WorkspaceSummary(
        id=UUID(data["id"]),
        customer_id=UUID(data["customer_id"]),
        customer_name=data["customer_name"],
        customer_email=data["customer_email"],
        customer_phone=data["customer_phone"],
        product_type=data["product_type"],
        workflow_status=data["workflow_status"],
        record_status=data["record_status"],
        latest_version_id=UUID(data["latest_version_id"]) if data["latest_version_id"] else None,
        approved_version_id=(
            UUID(data["approved_version_id"]) if data["approved_version_id"] else None
        ),
        production_version_id=(
            UUID(data["production_version_id"]) if data["production_version_id"] else None
        ),
        revision=int(data["revision"]),
        updated_at=datetime.fromisoformat(data["updated_at"]),
        assigned_designer_id=UUID(data.get("assigned_designer_id", str(actor_id))),
    )
    view = payload["review_link"]
    link_data = view["link"]
    link = WorkspaceReviewLink(
        id=UUID(link_data["id"]),
        workspace_id=UUID(link_data["workspace_id"]),
        version=int(link_data["version"]),
        status=ReviewLinkStatus(link_data["status"]),
        created_by=UUID(link_data["created_by"]),
        created_at=datetime.fromisoformat(link_data["created_at"]),
    )
    return WorkspaceCreated(workspace, ReviewLinkView(link, view["review_url"]))
