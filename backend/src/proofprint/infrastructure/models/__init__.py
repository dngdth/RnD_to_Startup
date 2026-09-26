"""Persistence models grouped by domain concern.

Importing this package registers every table on the shared ``Base.metadata`` while
keeping callers independent from the internal file layout.
"""

from proofprint.infrastructure.models.asset import AssetImageDataRow, AssetRow
from proofprint.infrastructure.models.base import Base
from proofprint.infrastructure.models.collaboration import CommentRow
from proofprint.infrastructure.models.event import AuditEventRow, OutboxMessageRow
from proofprint.infrastructure.models.idempotency import IdempotencyRecordRow
from proofprint.infrastructure.models.identity import (
    CustomerRow,
    UserCredentialRow,
    UserRow,
)
from proofprint.infrastructure.models.review import (
    ApprovalRow,
    ChangeRequestRow,
    ReviewRoundRow,
)
from proofprint.infrastructure.models.review_access import (
    WorkspaceGuestSessionRow,
    WorkspaceReviewLinkRow,
)
from proofprint.infrastructure.models.specification import (
    SpecificationBlockRow,
    SpecificationVersionRow,
)
from proofprint.infrastructure.models.version_view import GuestVersionViewRow
from proofprint.infrastructure.models.workspace import WorkspaceMembershipRow, WorkspaceRow
from proofprint.infrastructure.models.workspace_creation import WorkspaceCreationRequestRow
from proofprint.infrastructure.models.zalo_bot import ZaloBotBindingRow, ZaloLinkTokenRow

__all__ = [
    "ApprovalRow",
    "AssetImageDataRow",
    "AssetRow",
    "AuditEventRow",
    "Base",
    "ChangeRequestRow",
    "CommentRow",
    "CustomerRow",
    "GuestVersionViewRow",
    "IdempotencyRecordRow",
    "OutboxMessageRow",
    "ReviewRoundRow",
    "SpecificationBlockRow",
    "SpecificationVersionRow",
    "UserCredentialRow",
    "UserRow",
    "WorkspaceCreationRequestRow",
    "WorkspaceGuestSessionRow",
    "WorkspaceMembershipRow",
    "WorkspaceReviewLinkRow",
    "WorkspaceRow",
    "ZaloBotBindingRow",
    "ZaloLinkTokenRow",
]
