from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

from proofprint.domain.entities.identity import CurrentActor, SystemRole, UserStatus
from proofprint.domain.entities.workspace import WorkspaceSummary
from proofprint.domain.entities.zalo import (
    IssuedZaloLinkCode,
    ZaloBinding,
    ZaloLinkStatus,
    ZaloLinkToken,
    ZaloPrincipalType,
)
from proofprint.domain.exceptions import (
    PermissionDenied,
    ResourceNotFound,
    ValidationFailed,
)
from proofprint.domain.interfaces.authentication import DesignerAccountRepository
from proofprint.domain.interfaces.review_access import UnitOfWork
from proofprint.domain.interfaces.workspace import WorkspaceAccessRepository
from proofprint.domain.interfaces.zalo import ZaloLinkCodeService, ZaloLinkRepository


def _require_designer(actor: CurrentActor) -> None:
    if actor.system_role != SystemRole.DESIGNER:
        raise PermissionDenied("Chỉ Designer mới có thể quản lý liên kết Zalo")


def _status(binding: ZaloBinding | None) -> ZaloLinkStatus:
    if binding is None:
        return ZaloLinkStatus(False, None, None)
    return ZaloLinkStatus(
        True,
        binding.zalo_display_name,
        binding.created_at,
    )


def _customer_workspace(
    workspaces: WorkspaceAccessRepository,
    actor: CurrentActor,
    workspace_id: UUID,
) -> WorkspaceSummary:
    _require_designer(actor)
    grant = workspaces.get_active_grant(workspace_id, actor.id)
    workspace = workspaces.get(workspace_id)
    if grant is None or workspace is None or not grant.can_view:
        raise ResourceNotFound("Workspace không tồn tại")
    if workspace.assigned_designer_id != actor.id:
        raise PermissionDenied("Chỉ Designer phụ trách mới được liên kết Zalo khách hàng")
    return workspace


class GetDesignerZaloStatus:
    def __init__(self, links: ZaloLinkRepository) -> None:
        self.links = links

    def execute(self, actor: CurrentActor) -> ZaloLinkStatus:
        _require_designer(actor)
        return _status(self.links.get_user_binding(actor.id))


class IssueDesignerZaloLinkCode:
    def __init__(
        self,
        designers: DesignerAccountRepository,
        links: ZaloLinkRepository,
        codes: ZaloLinkCodeService,
        unit_of_work: UnitOfWork,
        ttl_minutes: int,
    ) -> None:
        self.designers = designers
        self.links = links
        self.codes = codes
        self.unit_of_work = unit_of_work
        self.ttl_minutes = ttl_minutes

    def execute(self, actor: CurrentActor) -> IssuedZaloLinkCode:
        _require_designer(actor)
        account = self.designers.find_designer(actor.id)
        if account is None or account.status != UserStatus.ACTIVE:
            raise ResourceNotFound("Tài khoản Designer không tồn tại hoặc đã bị khóa")
        if not account.phone:
            raise ValidationFailed("Admin cần cập nhật số điện thoại Designer trước")
        code, token_hash = self.codes.issue()
        now = datetime.now(UTC)
        token = ZaloLinkToken(
            id=uuid4(),
            principal_type=ZaloPrincipalType.DESIGNER,
            user_id=actor.id,
            customer_id=None,
            token_hash=token_hash,
            expires_at=now + timedelta(minutes=self.ttl_minutes),
            consumed_at=None,
            created_by=actor.id,
            created_at=now,
        )
        try:
            self.links.invalidate_user_tokens(actor.id)
            self.links.add_token(token)
            self.unit_of_work.commit()
        except Exception:
            self.unit_of_work.rollback()
            raise
        return IssuedZaloLinkCode(code, token.expires_at, token.principal_type)


class RevokeDesignerZaloLink:
    def __init__(self, links: ZaloLinkRepository, unit_of_work: UnitOfWork) -> None:
        self.links = links
        self.unit_of_work = unit_of_work

    def execute(self, actor: CurrentActor) -> None:
        _require_designer(actor)
        try:
            self.links.revoke_user_binding(actor.id)
            self.links.invalidate_user_tokens(actor.id)
            self.unit_of_work.commit()
        except Exception:
            self.unit_of_work.rollback()
            raise


class GetCustomerZaloStatus:
    def __init__(
        self, workspaces: WorkspaceAccessRepository, links: ZaloLinkRepository
    ) -> None:
        self.workspaces = workspaces
        self.links = links

    def execute(self, actor: CurrentActor, workspace_id: UUID) -> ZaloLinkStatus:
        workspace = _customer_workspace(self.workspaces, actor, workspace_id)
        return _status(self.links.get_customer_binding(workspace.customer_id))


class IssueCustomerZaloLinkCode:
    def __init__(
        self,
        workspaces: WorkspaceAccessRepository,
        links: ZaloLinkRepository,
        codes: ZaloLinkCodeService,
        unit_of_work: UnitOfWork,
        ttl_minutes: int,
    ) -> None:
        self.workspaces = workspaces
        self.links = links
        self.codes = codes
        self.unit_of_work = unit_of_work
        self.ttl_minutes = ttl_minutes

    def execute(
        self, actor: CurrentActor, workspace_id: UUID
    ) -> IssuedZaloLinkCode:
        workspace = _customer_workspace(self.workspaces, actor, workspace_id)
        if not workspace.customer_phone:
            raise ValidationFailed("Khách hàng cần có số điện thoại trước khi liên kết Zalo")
        code, token_hash = self.codes.issue()
        now = datetime.now(UTC)
        token = ZaloLinkToken(
            id=uuid4(),
            principal_type=ZaloPrincipalType.CUSTOMER,
            user_id=None,
            customer_id=workspace.customer_id,
            token_hash=token_hash,
            expires_at=now + timedelta(minutes=self.ttl_minutes),
            consumed_at=None,
            created_by=actor.id,
            created_at=now,
        )
        try:
            self.links.invalidate_customer_tokens(workspace.customer_id)
            self.links.add_token(token)
            self.unit_of_work.commit()
        except Exception:
            self.unit_of_work.rollback()
            raise
        return IssuedZaloLinkCode(code, token.expires_at, token.principal_type)


class RevokeCustomerZaloLink:
    def __init__(
        self,
        workspaces: WorkspaceAccessRepository,
        links: ZaloLinkRepository,
        unit_of_work: UnitOfWork,
    ) -> None:
        self.workspaces = workspaces
        self.links = links
        self.unit_of_work = unit_of_work

    def execute(self, actor: CurrentActor, workspace_id: UUID) -> None:
        workspace = _customer_workspace(self.workspaces, actor, workspace_id)
        try:
            self.links.revoke_customer_binding(workspace.customer_id)
            self.links.invalidate_customer_tokens(workspace.customer_id)
            self.unit_of_work.commit()
        except Exception:
            self.unit_of_work.rollback()
            raise


class ConsumeZaloLinkCode:
    def __init__(
        self,
        links: ZaloLinkRepository,
        codes: ZaloLinkCodeService,
        unit_of_work: UnitOfWork,
    ) -> None:
        self.links = links
        self.codes = codes
        self.unit_of_work = unit_of_work

    def execute(
        self, *, code: str, chat_id: str, display_name: str | None
    ) -> ZaloPrincipalType:
        normalized_chat = chat_id.strip()
        if not normalized_chat or len(normalized_chat) > 128:
            raise ValidationFailed("Zalo chat_id không hợp lệ")
        token = self.links.get_token_for_update(self.codes.hash(code))
        now = datetime.now(UTC)
        if token is None or token.consumed_at is not None:
            raise ValidationFailed("Mã liên kết không hợp lệ hoặc đã được sử dụng")
        if token.expires_at <= now:
            raise ValidationFailed("Mã liên kết đã hết hạn")
        try:
            self.links.bind_token(
                token,
                chat_id=normalized_chat,
                display_name=(display_name or "").strip()[:200] or None,
            )
            self.unit_of_work.commit()
        except Exception:
            self.unit_of_work.rollback()
            raise
        return token.principal_type
