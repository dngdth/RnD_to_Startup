from typing import Annotated

from fastapi import Cookie, Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from proofprint.application.use_cases import (
    AuthenticateUser,
    CreateGuestSession,
    CreateWorkspace,
    GetGuestWorkspace,
    GetWorkspace,
    ListWorkspaces,
    ManageDesignerAccounts,
    ResolveCurrentActor,
    ResolveGuestSession,
    ReviewLinkManager,
)
from proofprint.domain.entities.identity import CurrentActor
from proofprint.domain.entities.review_access import GuestPrincipal
from proofprint.domain.exceptions import AuthenticationRequired
from proofprint.infrastructure.database import get_session, settings
from proofprint.infrastructure.di import (
    build_authenticate_user,
    build_create_guest_session,
    build_create_workspace,
    build_get_guest_workspace,
    build_get_workspace,
    build_list_workspaces,
    build_manage_designer_accounts,
    build_resolve_current_actor,
    build_resolve_guest_session,
    build_review_link_manager,
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
