from dataclasses import dataclass
from datetime import datetime

from proofprint.domain.entities.review_access import GuestPrincipal, WorkspaceReviewLink
from proofprint.domain.entities.workspace import WorkspaceSummary


@dataclass(frozen=True, slots=True)
class ReviewLinkView:
    link: WorkspaceReviewLink
    review_url: str


@dataclass(frozen=True, slots=True)
class WorkspaceCreated:
    workspace: WorkspaceSummary
    review_link: ReviewLinkView


@dataclass(frozen=True, slots=True)
class CreatedGuestSession:
    principal: GuestPrincipal
    raw_session_token: str
    expires_at: datetime
