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
from proofprint.infrastructure.database import settings
from proofprint.infrastructure.repositories import (
    SqlAlchemyAuthenticationRepository,
    SqlAlchemyDesignerAccountRepository,
    SqlAlchemyDraftRepository,
    SqlAlchemyReviewAccessRepository,
    SqlAlchemyVersionRepository,
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


def build_manage_designer_accounts(session: Session) -> ManageDesignerAccounts:
    return ManageDesignerAccounts(
        SqlAlchemyDesignerAccountRepository(session),
        password_verifier,
        SqlAlchemyUnitOfWork(session),
    )


def build_get_draft(session: Session) -> GetDraft:
    return GetDraft(SqlAlchemyDraftRepository(session))


def build_upsert_draft_block(session: Session) -> UpsertDraftBlock:
    return UpsertDraftBlock(
        SqlAlchemyDraftRepository(session), SqlAlchemyUnitOfWork(session)
    )


def build_delete_draft_block(session: Session) -> DeleteDraftBlock:
    return DeleteDraftBlock(
        SqlAlchemyDraftRepository(session), SqlAlchemyUnitOfWork(session)
    )


def build_reorder_draft_blocks(session: Session) -> ReorderDraftBlocks:
    return ReorderDraftBlocks(
        SqlAlchemyDraftRepository(session), SqlAlchemyUnitOfWork(session)
    )


def build_register_asset(session: Session) -> RegisterAsset:
    return RegisterAsset(
        SqlAlchemyDraftRepository(session), SqlAlchemyUnitOfWork(session)
    )


def build_get_asset(session: Session) -> GetAsset:
    return GetAsset(SqlAlchemyDraftRepository(session))


def build_start_revision(session: Session) -> StartRevision:
    return StartRevision(
        SqlAlchemyDraftRepository(session), SqlAlchemyUnitOfWork(session)
    )


def build_release_version(session: Session) -> ReleaseVersion:
    return ReleaseVersion(
        SqlAlchemyVersionRepository(session), SqlAlchemyUnitOfWork(session)
    )


def build_list_versions(session: Session) -> ListVersions:
    return ListVersions(SqlAlchemyVersionRepository(session))


def build_get_version(session: Session) -> GetVersion:
    return GetVersion(SqlAlchemyVersionRepository(session))


def build_get_version_diff(session: Session) -> GetVersionDiff:
    return GetVersionDiff(SqlAlchemyVersionRepository(session))


def build_get_review_round(session: Session) -> GetReviewRound:
    return GetReviewRound(SqlAlchemyVersionRepository(session))
