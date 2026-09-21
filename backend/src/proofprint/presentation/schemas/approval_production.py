from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel

from proofprint.domain.entities.approval_production import Approval, ProductionSnapshot


class ApprovalResponse(BaseModel):
    id: UUID
    workspace_id: UUID
    review_round_id: UUID
    version_id: UUID
    guest_session_id: UUID
    reviewer_username_snapshot: str
    review_link_version: int
    created_at: datetime

    @classmethod
    def from_domain(cls, approval: Approval) -> ApprovalResponse:
        return cls(
            id=approval.id,
            workspace_id=approval.workspace_id,
            review_round_id=approval.review_round_id,
            version_id=approval.version_id,
            guest_session_id=approval.guest_session_id,
            reviewer_username_snapshot=approval.reviewer_username_snapshot,
            review_link_version=approval.review_link_version,
            created_at=approval.created_at,
        )


class ApprovalMutationResponse(BaseModel):
    approval: ApprovalResponse
    workspace_revision: int


class ProductionVersionResponse(BaseModel):
    id: UUID
    workspace_id: UUID
    number: int
    previous_version_id: UUID | None
    snapshot: list[dict[str, Any]]
    content_hash: str
    schema_version: int
    created_by: UUID
    created_at: datetime


class ProductionSnapshotResponse(BaseModel):
    version: ProductionVersionResponse
    approval: ApprovalResponse
    workspace_revision: int

    @classmethod
    def from_domain(cls, value: ProductionSnapshot) -> ProductionSnapshotResponse:
        version = value.version
        return cls(
            version=ProductionVersionResponse(
                id=version.id,
                workspace_id=version.workspace_id,
                number=version.number,
                previous_version_id=version.previous_version_id,
                snapshot=version.snapshot,
                content_hash=version.content_hash,
                schema_version=version.schema_version,
                created_by=version.created_by,
                created_at=version.created_at,
            ),
            approval=ApprovalResponse.from_domain(value.approval),
            workspace_revision=value.workspace_revision,
        )
