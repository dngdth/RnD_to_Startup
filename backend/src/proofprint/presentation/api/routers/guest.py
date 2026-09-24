from fastapi import APIRouter, Response, status

from proofprint.domain.entities.identity import SystemRole
from proofprint.domain.entities.workspace import WorkspaceGrant
from proofprint.presentation.api.dependencies import (
    CreateGuestSessionDep,
    CurrentGuestDep,
    GetGuestWorkspaceDep,
    RevokeGuestSessionDep,
    clear_guest_cookie,
    set_guest_cookie,
)
from proofprint.presentation.schemas.draft import SpecificationBlockResponse
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
    created = use_case.execute(review_token=payload.review_token, username=payload.username)
    set_guest_cookie(response, created.raw_session_token, created.expires_at)
    return GuestSessionResponse(
        workspace_id=created.principal.workspace_id,
        username=created.principal.username,
        expires_at=created.expires_at,
    )


@router.delete("/sessions/current", status_code=status.HTTP_204_NO_CONTENT)
def revoke_guest_session(
    response: Response,
    guest: CurrentGuestDep,
    use_case: RevokeGuestSessionDep,
) -> None:
    use_case.execute(guest)
    clear_guest_cookie(response)


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
        review_link_id=guest.review_link_id,
        reviewer_username=guest.username,
        workspace=WorkspaceResponse.from_domain(workspace, grant),
        draft_blocks=[
            SpecificationBlockResponse.from_domain(block)
            for block in use_case.draft_blocks(guest)
        ],
    )
