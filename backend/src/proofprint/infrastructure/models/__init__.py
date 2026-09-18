"""Persistence models grouped by domain concern.

Importing this package registers every table on the shared ``Base.metadata`` while
keeping callers independent from the internal file layout.
"""

from proofprint.infrastructure.models.asset import AssetRow
from proofprint.infrastructure.models.base import Base
from proofprint.infrastructure.models.collaboration import CommentRow
from proofprint.infrastructure.models.event import AuditEventRow, OutboxMessageRow
from proofprint.infrastructure.models.identity import (
    CustomerRow,
    CustomerUserRow,
    DesignerCustomerAssignmentRow,
    UserCredentialRow,
    UserRow,
)
from proofprint.infrastructure.models.review import (
    ApprovalRow,
    ChangeRequestRow,
    ReviewRoundRow,
)
from proofprint.infrastructure.models.specification import (
    SpecificationBlockRow,
    SpecificationVersionRow,
)
from proofprint.infrastructure.models.workspace import WorkspaceMembershipRow, WorkspaceRow

__all__ = [
    "ApprovalRow",
    "AssetRow",
    "AuditEventRow",
    "Base",
    "ChangeRequestRow",
    "CommentRow",
    "CustomerRow",
    "CustomerUserRow",
    "DesignerCustomerAssignmentRow",
    "OutboxMessageRow",
    "ReviewRoundRow",
    "SpecificationBlockRow",
    "SpecificationVersionRow",
    "UserCredentialRow",
    "UserRow",
    "WorkspaceMembershipRow",
    "WorkspaceRow",
]
