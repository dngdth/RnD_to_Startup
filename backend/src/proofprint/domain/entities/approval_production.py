from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from uuid import UUID

from proofprint.domain.entities.version import SpecificationVersion


@dataclass(frozen=True, slots=True)
class Approval:
    id: UUID
    workspace_id: UUID
    review_round_id: UUID
    version_id: UUID
    guest_session_id: UUID
    reviewer_username_snapshot: str
    review_link_version: int
    created_at: datetime


@dataclass(frozen=True, slots=True)
class ProductionSnapshot:
    version: SpecificationVersion
    approval: Approval
    workspace_revision: int
