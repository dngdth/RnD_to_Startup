from datetime import datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Query, Response

from proofprint.presentation.api.dependencies import (
    ArchiveWorkspaceDep,
    CancelWorkspaceDep,
    CurrentActorDep,
    IfMatchDep,
    ListWorkspaceAuditEventsDep,
    RestoreWorkspaceDep,
)
from proofprint.presentation.schemas.workspace_lifecycle import (
    ArchiveWorkspaceRequest,
    OptionalWorkspaceReasonRequest,
    WorkspaceAuditPageResponse,
)
from proofprint.presentation.schemas.workspaces import WorkspaceResponse

router = APIRouter(prefix="/workspaces", tags=["workspace lifecycle and audit"])


@router.get("/{workspace_id}/audit-events", response_model=WorkspaceAuditPageResponse)
def list_workspace_audit_events(
    workspace_id: UUID,
    actor: CurrentActorDep,
    use_case: ListWorkspaceAuditEventsDep,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
    event_type: str | None = None,
    entity_type: str | None = None,
    actor_id: UUID | None = None,
    guest_session_id: UUID | None = None,
    created_from: datetime | None = None,
    created_to: datetime | None = None,
) -> WorkspaceAuditPageResponse:
    page = use_case.execute(
        actor=actor,
        workspace_id=workspace_id,
        limit=limit,
        offset=offset,
        event_type=event_type,
        entity_type=entity_type,
        actor_id=actor_id,
        guest_session_id=guest_session_id,
        created_from=created_from,
        created_to=created_to,
    )
    return WorkspaceAuditPageResponse.from_domain(page)


@router.post("/{workspace_id}/archive", response_model=WorkspaceResponse)
def archive_workspace(
    workspace_id: UUID,
    payload: ArchiveWorkspaceRequest,
    response: Response,
    actor: CurrentActorDep,
    expected_revision: IfMatchDep,
    use_case: ArchiveWorkspaceDep,
) -> WorkspaceResponse:
    workspace = use_case.execute(
        actor=actor,
        workspace_id=workspace_id,
        expected_revision=expected_revision,
        reason=payload.reason,
    )
    response.headers["ETag"] = f'W/"{workspace.revision}"'
    return WorkspaceResponse.from_domain(workspace)


@router.post("/{workspace_id}/restore", response_model=WorkspaceResponse)
def restore_workspace(
    workspace_id: UUID,
    response: Response,
    actor: CurrentActorDep,
    expected_revision: IfMatchDep,
    use_case: RestoreWorkspaceDep,
    payload: OptionalWorkspaceReasonRequest | None = None,
) -> WorkspaceResponse:
    workspace = use_case.execute(
        actor=actor,
        workspace_id=workspace_id,
        expected_revision=expected_revision,
        reason=payload.reason if payload is not None else None,
    )
    response.headers["ETag"] = f'W/"{workspace.revision}"'
    return WorkspaceResponse.from_domain(workspace)


@router.post("/{workspace_id}/cancel", response_model=WorkspaceResponse)
def cancel_workspace(
    workspace_id: UUID,
    response: Response,
    actor: CurrentActorDep,
    expected_revision: IfMatchDep,
    use_case: CancelWorkspaceDep,
    payload: OptionalWorkspaceReasonRequest | None = None,
) -> WorkspaceResponse:
    workspace = use_case.execute(
        actor=actor,
        workspace_id=workspace_id,
        expected_revision=expected_revision,
        reason=payload.reason if payload is not None else None,
    )
    response.headers["ETag"] = f'W/"{workspace.revision}"'
    return WorkspaceResponse.from_domain(workspace)
