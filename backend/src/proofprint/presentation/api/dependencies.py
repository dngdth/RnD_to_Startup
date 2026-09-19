from typing import Annotated

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from proofprint.application.use_cases import (
    AuthenticateUser,
    GetWorkspace,
    ListWorkspaces,
    ResolveCurrentActor,
)
from proofprint.domain.entities.identity import CurrentActor
from proofprint.domain.exceptions import AuthenticationRequired
from proofprint.infrastructure.database import get_session
from proofprint.infrastructure.di import (
    build_authenticate_user,
    build_get_workspace,
    build_list_workspaces,
    build_resolve_current_actor,
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


AuthenticateUserDep = Annotated[AuthenticateUser, Depends(get_authenticate_user)]
ResolveCurrentActorDep = Annotated[ResolveCurrentActor, Depends(get_resolve_current_actor)]
ListWorkspacesDep = Annotated[ListWorkspaces, Depends(get_list_workspaces)]
GetWorkspaceDep = Annotated[GetWorkspace, Depends(get_workspace)]


def get_current_actor(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
    resolve_actor: ResolveCurrentActorDep,
) -> CurrentActor:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise AuthenticationRequired("Bearer access token is required")
    return resolve_actor.execute(credentials.credentials)


CurrentActorDep = Annotated[CurrentActor, Depends(get_current_actor)]
