from typing import Annotated

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from proofprint.application.authentication import AuthenticationService
from proofprint.application.workspaces import WorkspaceQueryService
from proofprint.domain.errors import AuthenticationRequired
from proofprint.domain.identity import CurrentActor
from proofprint.infrastructure.auth_repository import SqlAlchemyAuthenticationRepository
from proofprint.infrastructure.database import get_session, settings
from proofprint.infrastructure.security import Argon2PasswordVerifier, JwtAccessTokenCodec
from proofprint.infrastructure.workspace_repository import SqlAlchemyWorkspaceAccessRepository

bearer_scheme = HTTPBearer(auto_error=False)
password_verifier = Argon2PasswordVerifier()
token_codec = JwtAccessTokenCodec(
    secret_key=settings.auth_secret_key.get_secret_value(),
    issuer=settings.auth_issuer,
    ttl_minutes=settings.auth_token_ttl_minutes,
)


def get_authentication_service(
    session: Annotated[Session, Depends(get_session)],
) -> AuthenticationService:
    return AuthenticationService(
        SqlAlchemyAuthenticationRepository(session), password_verifier, token_codec
    )


def get_workspace_query_service(
    session: Annotated[Session, Depends(get_session)],
) -> WorkspaceQueryService:
    return WorkspaceQueryService(SqlAlchemyWorkspaceAccessRepository(session))


def get_current_actor(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
    authentication: Annotated[AuthenticationService, Depends(get_authentication_service)],
) -> CurrentActor:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise AuthenticationRequired("Bearer access token is required")
    return authentication.resolve_actor(credentials.credentials)


AuthenticationDep = Annotated[AuthenticationService, Depends(get_authentication_service)]
WorkspaceQueryDep = Annotated[WorkspaceQueryService, Depends(get_workspace_query_service)]
CurrentActorDep = Annotated[CurrentActor, Depends(get_current_actor)]
