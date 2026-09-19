from datetime import UTC, datetime

from fastapi import APIRouter, Response, status

from proofprint.domain.entities.identity import SystemRole
from proofprint.domain.entities.workspace import WorkspaceGrant
from proofprint.infrastructure.database import settings
from proofprint.presentation.api.dependencies import (
    CreateGuestSessionDep,
    CurrentGuestDep,
    GetGuestWorkspaceDep,
)
from proofprint.presentation.schemas.guest import (
    CreateGuestSessionRequest,
    GuestSessionResponse,
    GuestWorkspaceResponse,
)
from proofprint.presentation.schemas.workspaces import WorkspaceResponse

router = APIRouter(prefix="/guest", tags=["guest review"])


@router.post(
    "/sessions", response_model=GuestSessionResponse, status_code=status.HTTP_201_CREATED
)
def create_guest_session(
    payload: CreateGuestSessionRequest,
    response: Response,
    use_case: CreateGuestSessionDep,
) -> GuestSessionResponse:
    created = use_case.execute(review_token=payload.review_token, email=payload.email)
    max_age = max(0, int((created.expires_at - datetime.now(UTC)).total_seconds()))
    response.set_cookie(
        key=settings.guest_session_cookie_name,
        value=created.raw_session_token,
        max_age=max_age,
        expires=created.expires_at,
        httponly=True,
        secure=settings.guest_session_cookie_secure,
        samesite="lax",
        path="/api/v1/guest",
    )
    return GuestSessionResponse(
        workspace_id=created.principal.workspace_id,
        email=created.principal.email,
        expires_at=created.expires_at,
    )


@router.get("/workspace", response_model=GuestWorkspaceResponse)
def get_guest_workspace(
    guest: CurrentGuestDep,
    use_case: GetGuestWorkspaceDep,
) -> GuestWorkspaceResponse:
    workspace = use_case.execute(guest)
    grant = WorkspaceGrant(
        workspace_id=workspace.id,
        role=SystemRole.CUSTOMER,
        can_view=True,
        can_edit=False,
        can_review=True,
        can_approve=True,
        can_lock_production=False,
    )
    return GuestWorkspaceResponse(
        reviewer_email=guest.email,
        workspace=WorkspaceResponse.from_domain(workspace, grant),
    )
