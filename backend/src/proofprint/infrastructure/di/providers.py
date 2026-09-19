from sqlalchemy.orm import Session

from proofprint.application.use_cases import (
    AuthenticateUser,
    CreateGuestSession,
    CreateWorkspace,
    GetGuestWorkspace,
    GetWorkspace,
    ListWorkspaces,
    ResolveCurrentActor,
    ResolveGuestSession,
    ReviewLinkManager,
)
from proofprint.infrastructure.database import settings
from proofprint.infrastructure.repositories import (
    SqlAlchemyAuthenticationRepository,
    SqlAlchemyReviewAccessRepository,
    SqlAlchemyWorkspaceAccessRepository,
    SqlAlchemyWorkspaceCommandRepository,
)
from proofprint.infrastructure.security import (
    Argon2PasswordVerifier,
    HmacReviewLinkTokenCodec,
    JwtAccessTokenCodec,
    OpaqueGuestSessionTokenService,
)
from proofprint.infrastructure.unit_of_work import SqlAlchemyUnitOfWork

password_verifier = Argon2PasswordVerifier()
token_codec = JwtAccessTokenCodec(
    secret_key=settings.auth_secret_key.get_secret_value(),
    issuer=settings.auth_issuer,
    ttl_minutes=settings.auth_token_ttl_minutes,
)
review_link_codec = HmacReviewLinkTokenCodec(
    settings.review_link_secret_key.get_secret_value()
)
guest_session_tokens = OpaqueGuestSessionTokenService()


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


def build_create_workspace(session: Session) -> CreateWorkspace:
    return CreateWorkspace(
        SqlAlchemyWorkspaceCommandRepository(session),
        SqlAlchemyReviewAccessRepository(session),
        review_link_codec,
        SqlAlchemyUnitOfWork(session),
        settings.review_base_url,
    )


def build_review_link_manager(session: Session) -> ReviewLinkManager:
    return ReviewLinkManager(
        SqlAlchemyWorkspaceCommandRepository(session),
        SqlAlchemyReviewAccessRepository(session),
        review_link_codec,
        SqlAlchemyUnitOfWork(session),
        settings.review_base_url,
    )


def build_create_guest_session(session: Session) -> CreateGuestSession:
    return CreateGuestSession(
        SqlAlchemyReviewAccessRepository(session),
        SqlAlchemyWorkspaceAccessRepository(session),
        SqlAlchemyWorkspaceCommandRepository(session),
        review_link_codec,
        guest_session_tokens,
        SqlAlchemyUnitOfWork(session),
        settings.guest_session_ttl_hours,
    )


def build_resolve_guest_session(session: Session) -> ResolveGuestSession:
    return ResolveGuestSession(
        SqlAlchemyReviewAccessRepository(session), guest_session_tokens
    )


def build_get_guest_workspace(session: Session) -> GetGuestWorkspace:
    return GetGuestWorkspace(SqlAlchemyWorkspaceAccessRepository(session))
