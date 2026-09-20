from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from enum import StrEnum
from typing import Any
from uuid import UUID


class ReviewRoundStatus(StrEnum):
    OPEN = "OPEN"
    APPROVED = "APPROVED"
    CHANGES_REQUESTED = "CHANGES_REQUESTED"
    CANCELLED = "CANCELLED"


class VersionDisplayStatus(StrEnum):
    IN_REVIEW = "IN_REVIEW"
    APPROVED = "APPROVED"
    LOCKED_FOR_PRODUCTION = "LOCKED_FOR_PRODUCTION"
    HISTORICAL = "HISTORICAL"


@dataclass(frozen=True, slots=True)
class SpecificationVersion:
    id: UUID
    workspace_id: UUID
    number: int
    previous_version_id: UUID | None
    snapshot: list[dict[str, Any]]
    content_hash: str
    schema_version: int
    created_by: UUID
    created_at: datetime


@dataclass(frozen=True, slots=True)
class ReviewRound:
    id: UUID
    workspace_id: UUID
    version_id: UUID
    status: ReviewRoundStatus
    opened_at: datetime
    closed_at: datetime | None = None
    decided_by: UUID | None = None
    decision_note: str | None = None


@dataclass(frozen=True, slots=True)
class VersionWithStatus:
    version: SpecificationVersion
    status: VersionDisplayStatus


@dataclass(frozen=True, slots=True)
class FieldChange:
    block_id: UUID
    field_path: str
    before: Any
    after: Any


@dataclass(frozen=True, slots=True)
class BlockReorder:
    block_id: UUID
    before_position: int
    after_position: int


@dataclass(frozen=True, slots=True)
class StructuredDiff:
    base_version_id: UUID | None
    target_version_id: UUID
    added: list[dict[str, Any]]
    removed: list[dict[str, Any]]
    changed: list[FieldChange]
    reordered: list[BlockReorder]
