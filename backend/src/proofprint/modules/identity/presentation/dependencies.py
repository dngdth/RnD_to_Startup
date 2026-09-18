from typing import Annotated

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from proofprint.core.errors import AuthenticationRequired
from proofprint.infrastructure.database import get_session, settings
from proofprint.modules.identity.application import AuthenticationService
from proofprint.modules.identity.domain import CurrentActor
from proofprint.modules.identity.infrastructure import (
    Argon2PasswordVerifier,
    JwtAccessTokenCodec,
    SqlAlchemyAuthenticationRepository,
)

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


def get_current_actor(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
    authentication: Annotated[AuthenticationService, Depends(get_authentication_service)],
) -> CurrentActor:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise AuthenticationRequired("Bearer access token is required")
    return authentication.resolve_actor(credentials.credentials)


AuthenticationDep = Annotated[AuthenticationService, Depends(get_authentication_service)]
CurrentActorDep = Annotated[CurrentActor, Depends(get_current_actor)]
