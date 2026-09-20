from typing import Annotated

from fastapi import Cookie, Depends, Header
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from proofprint.application.use_cases import (
    AuthenticateUser,
    CreateGuestSession,
    CreateWorkspace,
    DeleteDraftBlock,
    GetAsset,
    GetDraft,
    GetGuestWorkspace,
    GetReviewRound,
    GetVersion,
    GetVersionDiff,
    GetWorkspace,
    ListVersions,
    ListWorkspaces,
    ManageDesignerAccounts,
    RegisterAsset,
    ReleaseVersion,
    ReorderDraftBlocks,
    ResolveCurrentActor,
    ResolveGuestSession,
    ReviewLinkManager,
    StartRevision,
    UpsertDraftBlock,
)
from proofprint.domain.entities.identity import CurrentActor
from proofprint.domain.entities.review_access import GuestPrincipal
from proofprint.domain.exceptions import AuthenticationRequired, ValidationFailed
from proofprint.infrastructure.database import get_session, settings
from proofprint.infrastructure.di import (
    build_authenticate_user,
    build_create_guest_session,
    build_create_workspace,
    build_delete_draft_block,
    build_get_asset,
    build_get_draft,
    build_get_guest_workspace,
    build_get_review_round,
    build_get_version,
    build_get_version_diff,
    build_get_workspace,
    build_list_versions,
    build_list_workspaces,
    build_manage_designer_accounts,
    build_register_asset,
    build_release_version,
    build_reorder_draft_blocks,
    build_resolve_current_actor,
    build_resolve_guest_session,
    build_review_link_manager,
    build_start_revision,
    build_upsert_draft_block,
)

bearer_scheme = HTTPBearer(auto_error=False)


def get_authenticate_user(
    session: Annotated[Session, Depends(get_session)],
) -> AuthenticateUser:
    return build_authenticate_user(session)


def get_resolve_current_actor(
    session: Annotated[Session, Depends(get_session)],
) -> ResolveCurrentActor:
    return build_resolve_current_actor(session)


def get_list_workspaces(
    session: Annotated[Session, Depends(get_session)],
) -> ListWorkspaces:
    return build_list_workspaces(session)


def get_workspace(
    session: Annotated[Session, Depends(get_session)],
) -> GetWorkspace:
    return build_get_workspace(session)


def get_create_workspace(
    session: Annotated[Session, Depends(get_session)],
) -> CreateWorkspace:
    return build_create_workspace(session)


def get_review_link_manager(
    session: Annotated[Session, Depends(get_session)],
) -> ReviewLinkManager:
    return build_review_link_manager(session)


def get_create_guest_session(
    session: Annotated[Session, Depends(get_session)],
) -> CreateGuestSession:
    return build_create_guest_session(session)


def get_resolve_guest_session(
    session: Annotated[Session, Depends(get_session)],
) -> ResolveGuestSession:
    return build_resolve_guest_session(session)


def get_guest_workspace(
    session: Annotated[Session, Depends(get_session)],
) -> GetGuestWorkspace:
    return build_get_guest_workspace(session)


def get_manage_designer_accounts(
    session: Annotated[Session, Depends(get_session)],
) -> ManageDesignerAccounts:
    return build_manage_designer_accounts(session)


def get_draft(
    session: Annotated[Session, Depends(get_session)],
) -> GetDraft:
    return build_get_draft(session)


def get_upsert_draft_block(
    session: Annotated[Session, Depends(get_session)],
) -> UpsertDraftBlock:
    return build_upsert_draft_block(session)


def get_delete_draft_block(
    session: Annotated[Session, Depends(get_session)],
) -> DeleteDraftBlock:
    return build_delete_draft_block(session)


def get_reorder_draft_blocks(
    session: Annotated[Session, Depends(get_session)],
) -> ReorderDraftBlocks:
    return build_reorder_draft_blocks(session)


def get_register_asset(
    session: Annotated[Session, Depends(get_session)],
) -> RegisterAsset:
    return build_register_asset(session)


def get_asset(
    session: Annotated[Session, Depends(get_session)],
) -> GetAsset:
    return build_get_asset(session)


def get_start_revision(
    session: Annotated[Session, Depends(get_session)],
) -> StartRevision:
    return build_start_revision(session)


def get_release_version(
    session: Annotated[Session, Depends(get_session)],
) -> ReleaseVersion:
    return build_release_version(session)


def get_list_versions(
    session: Annotated[Session, Depends(get_session)],
) -> ListVersions:
    return build_list_versions(session)


def get_version(
    session: Annotated[Session, Depends(get_session)],
) -> GetVersion:
    return build_get_version(session)


def get_version_diff(
    session: Annotated[Session, Depends(get_session)],
) -> GetVersionDiff:
    return build_get_version_diff(session)


def get_review_round(
    session: Annotated[Session, Depends(get_session)],
) -> GetReviewRound:
    return build_get_review_round(session)


AuthenticateUserDep = Annotated[AuthenticateUser, Depends(get_authenticate_user)]
ResolveCurrentActorDep = Annotated[ResolveCurrentActor, Depends(get_resolve_current_actor)]
ListWorkspacesDep = Annotated[ListWorkspaces, Depends(get_list_workspaces)]
GetWorkspaceDep = Annotated[GetWorkspace, Depends(get_workspace)]
CreateWorkspaceDep = Annotated[CreateWorkspace, Depends(get_create_workspace)]
ReviewLinkManagerDep = Annotated[ReviewLinkManager, Depends(get_review_link_manager)]
CreateGuestSessionDep = Annotated[CreateGuestSession, Depends(get_create_guest_session)]
ResolveGuestSessionDep = Annotated[ResolveGuestSession, Depends(get_resolve_guest_session)]
GetGuestWorkspaceDep = Annotated[GetGuestWorkspace, Depends(get_guest_workspace)]
ManageDesignersDep = Annotated[
    ManageDesignerAccounts, Depends(get_manage_designer_accounts)
]
GetDraftDep = Annotated[GetDraft, Depends(get_draft)]
UpsertDraftBlockDep = Annotated[UpsertDraftBlock, Depends(get_upsert_draft_block)]
DeleteDraftBlockDep = Annotated[DeleteDraftBlock, Depends(get_delete_draft_block)]
ReorderDraftBlocksDep = Annotated[
    ReorderDraftBlocks, Depends(get_reorder_draft_blocks)
]
RegisterAssetDep = Annotated[RegisterAsset, Depends(get_register_asset)]
GetAssetDep = Annotated[GetAsset, Depends(get_asset)]
StartRevisionDep = Annotated[StartRevision, Depends(get_start_revision)]
ReleaseVersionDep = Annotated[ReleaseVersion, Depends(get_release_version)]
ListVersionsDep = Annotated[ListVersions, Depends(get_list_versions)]
GetVersionDep = Annotated[GetVersion, Depends(get_version)]
GetVersionDiffDep = Annotated[GetVersionDiff, Depends(get_version_diff)]
GetReviewRoundDep = Annotated[GetReviewRound, Depends(get_review_round)]


def get_current_actor(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
    resolve_actor: ResolveCurrentActorDep,
) -> CurrentActor:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise AuthenticationRequired("Bearer access token is required")
    return resolve_actor.execute(credentials.credentials)


CurrentActorDep = Annotated[CurrentActor, Depends(get_current_actor)]


def get_current_guest(
    resolve_guest: ResolveGuestSessionDep,
    session_token: Annotated[
        str | None,
        Cookie(alias=settings.guest_session_cookie_name),
    ] = None,
) -> GuestPrincipal:
    if not session_token:
        raise AuthenticationRequired("Guest session is required")
    return resolve_guest.execute(session_token)


CurrentGuestDep = Annotated[GuestPrincipal, Depends(get_current_guest)]


def get_workspace_viewer(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
    resolve_actor: ResolveCurrentActorDep,
    resolve_guest: ResolveGuestSessionDep,
    session_token: Annotated[
        str | None,
        Cookie(alias=settings.guest_session_cookie_name),
    ] = None,
) -> CurrentActor | GuestPrincipal:
    if credentials is not None:
        if credentials.scheme.lower() != "bearer":
            raise AuthenticationRequired("Bearer access token is required")
        return resolve_actor.execute(credentials.credentials)
    if session_token:
        return resolve_guest.execute(session_token)
    raise AuthenticationRequired("Bearer access token or guest session is required")


WorkspaceViewerDep = Annotated[
    CurrentActor | GuestPrincipal, Depends(get_workspace_viewer)
]


def parse_if_match(value: Annotated[str, Header(alias="If-Match")]) -> int:
    normalized = value.strip()
    if normalized.startswith("W/"):
        normalized = normalized[2:].strip()
    normalized = normalized.strip('"')
    try:
        revision = int(normalized)
    except ValueError as exc:
        raise ValidationFailed("If-Match must contain a workspace revision") from exc
    if revision < 0:
        raise ValidationFailed("If-Match revision must not be negative")
    return revision


IfMatchDep = Annotated[int, Depends(parse_if_match)]


def parse_idempotency_key(
    value: Annotated[str, Header(alias="Idempotency-Key")],
) -> str:
    normalized = value.strip()
    if not normalized or len(normalized) > 200:
        raise ValidationFailed("Idempotency-Key must contain 1 to 200 characters")
    return normalized


IdempotencyKeyDep = Annotated[str, Depends(parse_idempotency_key)]
