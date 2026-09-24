from sqlalchemy.orm import Session

from proofprint.application.use_cases import (
    AcknowledgeChangeRequest,
    AuthenticateUser,
    CancelChangeRequest,
    ConfirmChangeRequest,
    CreateChangeRequest,
    CreateComment,
    CreateDesigner,
    CreateGuestSession,
    CreateWorkspace,
    DeleteDraftBlock,
    DisableReviewLink,
    GetAsset,
    GetChangeRequest,
    GetDraft,
    GetGuestWorkspace,
    GetReviewLink,
    GetReviewRound,
    GetVersion,
    GetVersionDiff,
    GetWorkspace,
    ListChangeRequests,
    ListComments,
    ListDesigners,
    ListVersions,
    ListWorkspaces,
    MarkChangeRequestUpdated,
    ReadWorkspaceImage,
    RegisterAsset,
    RejectChangeRequest,
    ReleaseVersion,
    ReopenChangeRequest,
    ReorderDraftBlocks,
    RequestChanges,
    ResolveCurrentActor,
    ResolveGuestSession,
    RevokeGuestSession,
    RotateReviewLink,
    SetDesignerStatus,
    StartRevision,
    UploadWorkspaceImage,
    UpsertDraftBlock,
)
from proofprint.application.use_cases.manage_approvals import (
    ApproveVersion,
    GetProductionSnapshot,
    LockProduction,
)
from proofprint.application.use_cases.manage_workspace_lifecycle import (
    ArchiveWorkspace,
    CancelWorkspace,
    ListWorkspaceAuditEvents,
    RestoreWorkspace,
)
from proofprint.application.use_cases.submit_customer_requests import SubmitCustomerRequests
from proofprint.infrastructure.database import settings
from proofprint.infrastructure.repositories import (
    SqlAlchemyAuthenticationRepository,
    SqlAlchemyCollaborationRepository,
    SqlAlchemyDesignerAccountRepository,
    SqlAlchemyDraftRepository,
    SqlAlchemyReviewAccessRepository,
    SqlAlchemyVersionRepository,
    SqlAlchemyWorkspaceAccessRepository,
    SqlAlchemyWorkspaceCommandRepository,
)
from proofprint.infrastructure.repositories.approval_production import (
    SqlAlchemyApprovalProductionRepository,
)
from proofprint.infrastructure.repositories.workspace_lifecycle import (
    SqlAlchemyWorkspaceLifecycleRepository,
)
from proofprint.infrastructure.security import (
    Argon2PasswordVerifier,
    HmacReviewLinkTokenCodec,
    JwtAccessTokenCodec,
    OpaqueGuestSessionTokenService,
)
from proofprint.application.use_cases.manage_workspace_lifecycle import (
    ArchiveWorkspace,
    CancelWorkspace,
    ListWorkspaceAuditEvents,
    RestoreWorkspace,
)

from proofprint.infrastructure.security.asset_attestations import HmacAssetAttestationVerifier
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


def build_get_review_link(session: Session) -> GetReviewLink:
    return GetReviewLink(
        SqlAlchemyWorkspaceCommandRepository(session),
        SqlAlchemyReviewAccessRepository(session), review_link_codec,
        SqlAlchemyUnitOfWork(session), settings.review_base_url,
    )


def build_disable_review_link(session: Session) -> DisableReviewLink:
    return DisableReviewLink(
        SqlAlchemyWorkspaceCommandRepository(session),
        SqlAlchemyReviewAccessRepository(session), review_link_codec,
        SqlAlchemyUnitOfWork(session), settings.review_base_url,
    )


def build_rotate_review_link(session: Session) -> RotateReviewLink:
    return RotateReviewLink(
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


def build_revoke_guest_session(session: Session) -> RevokeGuestSession:
    return RevokeGuestSession(
        SqlAlchemyReviewAccessRepository(session), SqlAlchemyUnitOfWork(session)
    )


def build_get_guest_workspace(session: Session) -> GetGuestWorkspace:
    return GetGuestWorkspace(
        SqlAlchemyWorkspaceAccessRepository(session), SqlAlchemyDraftRepository(session)
    )


def build_create_designer(session: Session) -> CreateDesigner:
    return CreateDesigner(
        SqlAlchemyDesignerAccountRepository(session),
        password_verifier,
        SqlAlchemyUnitOfWork(session),
    )


def build_list_designers(session: Session) -> ListDesigners:
    return ListDesigners(SqlAlchemyDesignerAccountRepository(session))


def build_set_designer_status(session: Session) -> SetDesignerStatus:
    return SetDesignerStatus(
        SqlAlchemyDesignerAccountRepository(session), SqlAlchemyUnitOfWork(session)
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
        SqlAlchemyDraftRepository(session),
        SqlAlchemyUnitOfWork(session),
        HmacAssetAttestationVerifier(
            settings.asset_attestation_secret_key.get_secret_value(),
            {item.strip().lower() for item in settings.asset_allowed_content_types.split(",")},
        ),
    )


def build_get_asset(session: Session) -> GetAsset:
    return GetAsset(SqlAlchemyDraftRepository(session))


def build_upload_workspace_image(session: Session) -> UploadWorkspaceImage:
    return UploadWorkspaceImage(
        SqlAlchemyDraftRepository(session), SqlAlchemyUnitOfWork(session)
    )


def build_read_workspace_image(session: Session) -> ReadWorkspaceImage:
    return ReadWorkspaceImage(
        SqlAlchemyDraftRepository(session), SqlAlchemyVersionRepository(session)
    )


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
    return GetVersion(
        SqlAlchemyVersionRepository(session), SqlAlchemyUnitOfWork(session)
    )


def build_get_version_diff(session: Session) -> GetVersionDiff:
    return GetVersionDiff(SqlAlchemyVersionRepository(session))


def build_get_review_round(session: Session) -> GetReviewRound:
    return GetReviewRound(SqlAlchemyVersionRepository(session))


def build_create_comment(session: Session) -> CreateComment:
    return CreateComment(
        SqlAlchemyCollaborationRepository(session), SqlAlchemyUnitOfWork(session)
    )


def build_list_comments(session: Session) -> ListComments:
    return ListComments(SqlAlchemyCollaborationRepository(session))


def build_create_change_request(session: Session) -> CreateChangeRequest:
    return CreateChangeRequest(
        SqlAlchemyCollaborationRepository(session), SqlAlchemyUnitOfWork(session)
    )


def build_list_change_requests(session: Session) -> ListChangeRequests:
    return ListChangeRequests(SqlAlchemyCollaborationRepository(session))


def build_get_change_request(session: Session) -> GetChangeRequest:
    return GetChangeRequest(SqlAlchemyCollaborationRepository(session))


def build_acknowledge_change_request(session: Session) -> AcknowledgeChangeRequest:
    return AcknowledgeChangeRequest(
        SqlAlchemyCollaborationRepository(session), SqlAlchemyUnitOfWork(session)
    )


def build_mark_change_request_updated(session: Session) -> MarkChangeRequestUpdated:
    return MarkChangeRequestUpdated(
        SqlAlchemyCollaborationRepository(session), SqlAlchemyUnitOfWork(session)
    )


def build_confirm_change_request(session: Session) -> ConfirmChangeRequest:
    return ConfirmChangeRequest(
        SqlAlchemyCollaborationRepository(session), SqlAlchemyUnitOfWork(session)
    )


def build_reopen_change_request(session: Session) -> ReopenChangeRequest:
    return ReopenChangeRequest(
        SqlAlchemyCollaborationRepository(session), SqlAlchemyUnitOfWork(session)
    )


def build_reject_change_request(session: Session) -> RejectChangeRequest:
    return RejectChangeRequest(
        SqlAlchemyCollaborationRepository(session), SqlAlchemyUnitOfWork(session)
    )


def build_cancel_change_request(session: Session) -> CancelChangeRequest:
    return CancelChangeRequest(
        SqlAlchemyCollaborationRepository(session), SqlAlchemyUnitOfWork(session)
    )


def build_request_changes(session: Session) -> RequestChanges:
    return RequestChanges(
        SqlAlchemyCollaborationRepository(session), SqlAlchemyUnitOfWork(session)
    )



def build_submit_customer_requests(session: Session) -> SubmitCustomerRequests:
    return SubmitCustomerRequests(
        SqlAlchemyCollaborationRepository(session), SqlAlchemyDraftRepository(session),
        SqlAlchemyUnitOfWork(session),
    )


def build_approve_version(session: Session) -> ApproveVersion:
    return ApproveVersion(
        SqlAlchemyApprovalProductionRepository(session), SqlAlchemyUnitOfWork(session)
    )


def build_lock_production(session: Session) -> LockProduction:
    return LockProduction(
        SqlAlchemyApprovalProductionRepository(session), SqlAlchemyUnitOfWork(session)
    )


def build_production_snapshot(session: Session) -> GetProductionSnapshot:
    return GetProductionSnapshot(SqlAlchemyApprovalProductionRepository(session))


def build_list_workspace_audit_events(session: Session) -> ListWorkspaceAuditEvents:
    return ListWorkspaceAuditEvents(SqlAlchemyWorkspaceLifecycleRepository(session))


def build_archive_workspace(session: Session) -> ArchiveWorkspace:
    return ArchiveWorkspace(
        SqlAlchemyWorkspaceLifecycleRepository(session), SqlAlchemyUnitOfWork(session)
    )


def build_restore_workspace(session: Session) -> RestoreWorkspace:
    return RestoreWorkspace(
        SqlAlchemyWorkspaceLifecycleRepository(session), SqlAlchemyUnitOfWork(session)
    )


def build_cancel_workspace(session: Session) -> CancelWorkspace:
    return CancelWorkspace(
        SqlAlchemyWorkspaceLifecycleRepository(session), SqlAlchemyUnitOfWork(session)
    )
