from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel

from proofprint.domain.entities.version import (
    BlockReorder,
    FieldChange,
    ReviewRound,
    ReviewRoundStatus,
    StructuredDiff,
    VersionDisplayStatus,
    VersionWithStatus,
)


class VersionSummaryResponse(BaseModel):
    id: UUID
    workspace_id: UUID
    number: int
    previous_version_id: UUID | None
    content_hash: str
    schema_version: int
    created_by: UUID
    created_at: datetime
    status: VersionDisplayStatus

    @classmethod
    def from_domain(cls, value: VersionWithStatus) -> VersionSummaryResponse:
        version = value.version
        return cls(
            id=version.id,
            workspace_id=version.workspace_id,
            number=version.number,
            previous_version_id=version.previous_version_id,
            content_hash=version.content_hash,
            schema_version=version.schema_version,
            created_by=version.created_by,
            created_at=version.created_at,
            status=value.status,
        )


class VersionResponse(VersionSummaryResponse):
    snapshot: list[dict[str, Any]]

    @classmethod
    def from_domain(cls, value: VersionWithStatus) -> VersionResponse:
        summary = VersionSummaryResponse.from_domain(value)
        return cls(**summary.model_dump(), snapshot=value.version.snapshot)


class ReviewRoundResponse(BaseModel):
    id: UUID
    workspace_id: UUID
    version_id: UUID
    status: ReviewRoundStatus
    opened_at: datetime
    closed_at: datetime | None
    decided_by: UUID | None
    decision_note: str | None

    @classmethod
    def from_domain(cls, value: ReviewRound) -> ReviewRoundResponse:
        return cls(
            id=value.id,
            workspace_id=value.workspace_id,
            version_id=value.version_id,
            status=value.status,
            opened_at=value.opened_at,
            closed_at=value.closed_at,
            decided_by=value.decided_by,
            decision_note=value.decision_note,
        )


class ReleasedVersionResponse(BaseModel):
    version: VersionResponse
    review_round: ReviewRoundResponse
    workspace_revision: int


class FieldChangeResponse(BaseModel):
    block_id: UUID
    field_path: str
    before: Any
    after: Any

    @classmethod
    def from_domain(cls, value: FieldChange) -> FieldChangeResponse:
        return cls(
            block_id=value.block_id,
            field_path=value.field_path,
            before=value.before,
            after=value.after,
        )


class BlockReorderResponse(BaseModel):
    block_id: UUID
    before_position: int
    after_position: int

    @classmethod
    def from_domain(cls, value: BlockReorder) -> BlockReorderResponse:
        return cls(
            block_id=value.block_id,
            before_position=value.before_position,
            after_position=value.after_position,
        )


class StructuredDiffResponse(BaseModel):
    base_version_id: UUID | None
    target_version_id: UUID
    added: list[dict[str, Any]]
    removed: list[dict[str, Any]]
    changed: list[FieldChangeResponse]
    reordered: list[BlockReorderResponse]

    @classmethod
    def from_domain(cls, value: StructuredDiff) -> StructuredDiffResponse:
        return cls(
            base_version_id=value.base_version_id,
            target_version_id=value.target_version_id,
            added=value.added,
            removed=value.removed,
            changed=[FieldChangeResponse.from_domain(item) for item in value.changed],
            reordered=[BlockReorderResponse.from_domain(item) for item in value.reordered],
        )
