import unittest
from dataclasses import replace
from datetime import UTC, datetime
from uuid import UUID, uuid4

from proofprint.application.use_cases.manage_zalo_links import (
    ConsumeZaloLinkCode,
    GetCustomerZaloStatus,
    IssueCustomerZaloLinkCode,
    IssueDesignerZaloLinkCode,
)
from proofprint.domain.entities.identity import (
    CurrentActor,
    DesignerAccount,
    SystemRole,
    UserStatus,
)
from proofprint.domain.entities.workspace import WorkspaceGrant, WorkspaceSummary
from proofprint.domain.entities.zalo import ZaloBinding, ZaloLinkToken
from proofprint.domain.exceptions import PermissionDenied, ValidationFailed


class FakeUnitOfWork:
    def __init__(self) -> None:
        self.commits = 0
        self.rollbacks = 0

    def commit(self) -> None:
        self.commits += 1

    def rollback(self) -> None:
        self.rollbacks += 1


class FixedCodes:
    def issue(self) -> tuple[str, str]:
        return "PP-ABCD-2345", "hash"

    def hash(self, _code: str) -> str:
        return "hash"


class FakeDesigners:
    def __init__(self, account: DesignerAccount) -> None:
        self.account = account

    def find_designer(self, user_id: UUID) -> DesignerAccount | None:
        return self.account if self.account.id == user_id else None


class FakeLinks:
    def __init__(self) -> None:
        self.token: ZaloLinkToken | None = None
        self.user_binding: ZaloBinding | None = None
        self.customer_binding: ZaloBinding | None = None

    def get_user_binding(self, _user_id: UUID) -> ZaloBinding | None:
        return self.user_binding

    def get_customer_binding(self, _customer_id: UUID) -> ZaloBinding | None:
        return self.customer_binding

    def get_binding_by_chat_id(self, _chat_id: str) -> ZaloBinding | None:
        return None

    def revoke_user_binding(self, _user_id: UUID) -> None:
        self.user_binding = None

    def revoke_customer_binding(self, _customer_id: UUID) -> None:
        self.customer_binding = None

    def invalidate_user_tokens(self, _user_id: UUID) -> None:
        self.token = None

    def invalidate_customer_tokens(self, _customer_id: UUID) -> None:
        self.token = None

    def add_token(self, token: ZaloLinkToken) -> None:
        self.token = token

    def get_token_for_update(self, token_hash: str) -> ZaloLinkToken | None:
        return self.token if self.token and self.token.token_hash == token_hash else None

    def bind_token(
        self,
        token: ZaloLinkToken,
        *,
        chat_id: str,
        display_name: str | None,
    ) -> ZaloBinding:
        now = datetime.now(UTC)
        binding = ZaloBinding(
            uuid4(), token.user_id, token.customer_id, chat_id, display_name, now, now
        )
        if token.user_id:
            self.user_binding = binding
        else:
            self.customer_binding = binding
        self.token = replace(token, consumed_at=now)
        return binding


class FakeWorkspaces:
    def __init__(self, workspace: WorkspaceSummary, owner_id: UUID) -> None:
        self.workspace = workspace
        self.owner_id = owner_id

    def get(self, workspace_id: UUID) -> WorkspaceSummary | None:
        return self.workspace if self.workspace.id == workspace_id else None

    def get_active_grant(
        self, workspace_id: UUID, user_id: UUID
    ) -> WorkspaceGrant | None:
        if workspace_id != self.workspace.id or user_id != self.owner_id:
            return None
        return WorkspaceGrant(
            workspace_id, SystemRole.DESIGNER, True, True, False, False, True
        )


class ZaloLinkTests(unittest.TestCase):
    def setUp(self) -> None:
        self.actor = CurrentActor(
            uuid4(), "designer@example.com", "Designer", SystemRole.DESIGNER
        )
        self.customer_id = uuid4()
        self.workspace = WorkspaceSummary(
            id=uuid4(),
            customer_id=self.customer_id,
            customer_name="Customer",
            customer_email=None,
            customer_phone="0901234567",
            product_type="Áo thun",
            workflow_status="DRAFT",
            record_status="ACTIVE",
            latest_version_id=None,
            approved_version_id=None,
            production_version_id=None,
            revision=0,
            updated_at=datetime.now(UTC),
            assigned_designer_id=self.actor.id,
        )
        self.links = FakeLinks()
        self.uow = FakeUnitOfWork()

    def test_designer_issues_code_and_bot_consumes_it_once(self) -> None:
        account = DesignerAccount(
            self.actor.id,
            self.actor.email,
            self.actor.display_name,
            UserStatus.ACTIVE,
            False,
            datetime.now(UTC),
            "0909999999",
        )
        issued = IssueDesignerZaloLinkCode(
            FakeDesigners(account), self.links, FixedCodes(), self.uow, 10
        ).execute(self.actor)
        self.assertEqual(issued.code, "PP-ABCD-2345")

        principal = ConsumeZaloLinkCode(
            self.links, FixedCodes(), self.uow
        ).execute(code=issued.code, chat_id="zalo-chat", display_name="Designer Zalo")
        self.assertEqual(principal.value, "DESIGNER")
        self.assertEqual(self.links.user_binding.chat_id, "zalo-chat")
        with self.assertRaises(ValidationFailed):
            ConsumeZaloLinkCode(self.links, FixedCodes(), self.uow).execute(
                code=issued.code, chat_id="zalo-chat", display_name="Designer Zalo"
            )

    def test_customer_code_is_scoped_to_assigned_designer(self) -> None:
        workspaces = FakeWorkspaces(self.workspace, self.actor.id)
        issued = IssueCustomerZaloLinkCode(
            workspaces, self.links, FixedCodes(), self.uow, 10
        ).execute(self.actor, self.workspace.id)
        self.assertEqual(issued.principal_type.value, "CUSTOMER")
        self.assertEqual(self.links.token.customer_id, self.customer_id)

        other = replace(self.actor, id=uuid4())
        with self.assertRaises(PermissionDenied):
            GetCustomerZaloStatus(
                FakeWorkspaces(self.workspace, other.id), self.links
            ).execute(
                other, self.workspace.id
            )

    def test_designer_without_phone_cannot_issue_link_code(self) -> None:
        account = DesignerAccount(
            self.actor.id,
            self.actor.email,
            self.actor.display_name,
            UserStatus.ACTIVE,
            False,
            datetime.now(UTC),
        )
        with self.assertRaises(ValidationFailed):
            IssueDesignerZaloLinkCode(
                FakeDesigners(account), self.links, FixedCodes(), self.uow, 10
            ).execute(self.actor)


if __name__ == "__main__":
    unittest.main()
