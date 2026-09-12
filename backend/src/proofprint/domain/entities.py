from __future__ import annotations

import json
from dataclasses import dataclass, field
from datetime import UTC, datetime
from enum import StrEnum
from typing import Any
from uuid import UUID, uuid4

from proofprint.domain.errors import InvalidState, StaleVersion


def utc_now() -> datetime:
    return datetime.now(UTC)


def canonical_json(value: Any) -> str:
    """Store a detached, deterministic copy of arbitrary JSON content."""
    return json.dumps(
        value, ensure_ascii=False, sort_keys=True, separators=(",", ":"), allow_nan=False
    )


class OrderStatus(StrEnum):
    DRAFT = "draft"
    IN_REVIEW = "in_review"
    APPROVED = "approved"
    LOCKED_FOR_PRODUCTION = "locked_for_production"


@dataclass(frozen=True, slots=True)
class SpecificationBlock:
    id: UUID
    block_type: str
    label: str
    content_json: str
    position: int = 0

    @classmethod
    def create(
        cls, *, id: UUID, block_type: str, label: str, content: dict[str, Any], position: int = 0
    ) -> SpecificationBlock:
        if not block_type.strip() or not label.strip():
            raise ValueError("block_type and label are required")
        if position < 0:
            raise ValueError("position must be non-negative")
        return cls(id, block_type.strip(), label.strip(), canonical_json(content), position)

    @property
    def content(self) -> dict[str, Any]:
        return json.loads(self.content_json)

    def as_snapshot(self) -> dict[str, Any]:
        return {
            "id": str(self.id),
            "block_type": self.block_type,
            "label": self.label,
            "content": self.content,
            "position": self.position,
        }


@dataclass(frozen=True, slots=True)
class SpecificationVersion:
    id: UUID
    number: int
    snapshot_json: str
    created_at: datetime

    @property
    def snapshot(self) -> list[dict[str, Any]]:
        return json.loads(self.snapshot_json)


@dataclass(frozen=True, slots=True)
class Approval:
    id: UUID
    version_id: UUID
    approver_id: UUID
    created_at: datetime


@dataclass(slots=True)
class OrderWorkspace:
    id: UUID
    customer_id: UUID
    product_type: str
    status: OrderStatus = OrderStatus.DRAFT
    blocks: dict[UUID, SpecificationBlock] = field(default_factory=dict)
    versions: tuple[SpecificationVersion, ...] = ()
    approvals: tuple[Approval, ...] = ()
    approved_version_id: UUID | None = None
    production_version_id: UUID | None = None

    @classmethod
    def create(cls, *, customer_id: UUID, product_type: str = "apparel") -> OrderWorkspace:
        if not product_type.strip():
            raise ValueError("product_type is required")
        return cls(id=uuid4(), customer_id=customer_id, product_type=product_type.strip())

    @property
    def latest_version(self) -> SpecificationVersion | None:
        return self.versions[-1] if self.versions else None

    def put_block(
        self,
        *,
        block_id: UUID,
        block_type: str,
        label: str,
        content: dict[str, Any],
        position: int = 0,
    ) -> SpecificationBlock:
        block = SpecificationBlock.create(
            id=block_id, block_type=block_type, label=label, content=content, position=position
        )
        self.blocks[block_id] = block
        # A released version remains intact; new edits start a new draft.
        self.status = OrderStatus.DRAFT
        self.approved_version_id = None
        return block

    def publish_version(self) -> SpecificationVersion:
        if not self.blocks:
            raise InvalidState("Add at least one specification block before publishing")
        snapshot = [
            block.as_snapshot()
            for block in sorted(
                self.blocks.values(), key=lambda item: (item.position, str(item.id))
            )
        ]
        snapshot_json = canonical_json(snapshot)
        if self.latest_version and self.latest_version.snapshot_json == snapshot_json:
            raise InvalidState("Specification has not changed since the latest version")
        version = SpecificationVersion(
            id=uuid4(),
            number=len(self.versions) + 1,
            snapshot_json=snapshot_json,
            created_at=utc_now(),
        )
        self.versions += (version,)
        self.approved_version_id = None
        self.status = OrderStatus.IN_REVIEW
        return version

    def approve(self, *, version_id: UUID, approver_id: UUID) -> Approval:
        if self.latest_version is None or self.latest_version.id != version_id:
            raise StaleVersion("Only the latest published version can be approved")
        if self.status != OrderStatus.IN_REVIEW:
            raise InvalidState("Order must be in review before approval")
        approval = Approval(uuid4(), version_id, approver_id, utc_now())
        self.approvals += (approval,)
        self.approved_version_id = version_id
        self.status = OrderStatus.APPROVED
        return approval

    def lock_for_production(self) -> SpecificationVersion:
        if self.status != OrderStatus.APPROVED or self.latest_version is None:
            raise InvalidState("Approve the latest version before locking for production")
        if self.approved_version_id != self.latest_version.id:
            raise StaleVersion("Approval must reference the latest version")
        self.production_version_id = self.latest_version.id
        self.status = OrderStatus.LOCKED_FOR_PRODUCTION
        return self.latest_version
