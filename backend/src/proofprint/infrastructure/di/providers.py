from sqlalchemy.orm import Session

from proofprint.application.use_cases import (
    AuthenticateUser,
    GetWorkspace,
    ListWorkspaces,
    ResolveCurrentActor,
)
from proofprint.infrastructure.database import settings
from proofprint.infrastructure.repositories import (
    SqlAlchemyAuthenticationRepository,
    SqlAlchemyWorkspaceAccessRepository,
)
from proofprint.infrastructure.security import Argon2PasswordVerifier, JwtAccessTokenCodec

password_verifier = Argon2PasswordVerifier()
token_codec = JwtAccessTokenCodec(
    secret_key=settings.auth_secret_key.get_secret_value(),
    issuer=settings.auth_issuer,
    ttl_minutes=settings.auth_token_ttl_minutes,
)


def build_authenticate_user(session: Session) -> AuthenticateUser:
    return AuthenticateUser(
        SqlAlchemyAuthenticationRepository(session), password_verifier, token_codec
    )


def build_resolve_current_actor(session: Session) -> ResolveCurrentActor:
    return ResolveCurrentActor(SqlAlchemyAuthenticationRepository(session), token_codec)


def build_list_workspaces(session: Session) -> ListWorkspaces:
    return ListWorkspaces(SqlAlchemyWorkspaceAccessRepository(session))


def build_get_workspace(session: Session) -> GetWorkspace:
    return GetWorkspace(SqlAlchemyWorkspaceAccessRepository(session))
