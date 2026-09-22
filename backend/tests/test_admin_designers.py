import unittest
from dataclasses import replace
from datetime import UTC, datetime
from uuid import UUID, uuid4

from proofprint.application.use_cases import CreateDesigner, ListDesigners, SetDesignerStatus
from proofprint.domain.entities.identity import (
    CurrentActor,
    DesignerAccount,
    SystemRole,
    UserStatus,
)
from proofprint.domain.exceptions import Conflict, PermissionDenied


class FakeDesignerRepository:
    def __init__(self) -> None:
        self.accounts: dict[UUID, DesignerAccount] = {}
        self.password_hashes: dict[UUID, str] = {}

    def list_designers(self) -> list[DesignerAccount]:
        return list(self.accounts.values())

    def find_designer(self, user_id: UUID) -> DesignerAccount | None:
        return self.accounts.get(user_id)

    def email_exists(self, email: str) -> bool:
        return any(item.email == email for item in self.accounts.values())

    def add_designer(self, account: DesignerAccount, *, password_hash: str) -> None:
        self.accounts[account.id] = account
        self.password_hashes[account.id] = password_hash

    def set_designer_status(self, user_id: UUID, status: UserStatus) -> None:
        self.accounts[user_id] = replace(self.accounts[user_id], status=status)


class FakePasswords:
    def hash(self, plain_password: str) -> str:
        return f"hashed:{plain_password}"


class FakeUnitOfWork:
    def __init__(self) -> None:
        self.commits = 0
        self.rollbacks = 0

    def commit(self) -> None:
        self.commits += 1

    def rollback(self) -> None:
        self.rollbacks += 1


class DesignerAccountTests(unittest.TestCase):
    def setUp(self) -> None:
        self.repository = FakeDesignerRepository()
        self.unit_of_work = FakeUnitOfWork()
        self.create_designer = CreateDesigner(
            self.repository, FakePasswords(), self.unit_of_work
        )
        self.list_designers = ListDesigners(self.repository)
        self.set_status = SetDesignerStatus(self.repository, self.unit_of_work)
        self.admin = CurrentActor(
            id=uuid4(),
            email="admin@example.com",
            display_name="Admin",
            system_role=SystemRole.ADMIN,
        )

    def test_admin_creates_lists_and_disables_designer(self) -> None:
        created = self.create_designer.execute(
            self.admin,
            email="  DESIGNER@example.com ",
            display_name="Designer A",
            temporary_password="Temporary-123!",
        )

        self.assertEqual(created.email, "designer@example.com")
        self.assertTrue(created.must_change_password)
        self.assertEqual(self.repository.password_hashes[created.id], "hashed:Temporary-123!")
        self.assertEqual(self.list_designers.execute(self.admin), [created])

        disabled = self.set_status.execute(self.admin, created.id, UserStatus.DISABLED)
        self.assertEqual(disabled.status, UserStatus.DISABLED)
        self.assertEqual(self.unit_of_work.commits, 2)

    def test_designer_cannot_manage_accounts(self) -> None:
        designer = CurrentActor(
            id=uuid4(),
            email="designer@example.com",
            display_name="Designer",
            system_role=SystemRole.DESIGNER,
        )
        with self.assertRaises(PermissionDenied):
            self.list_designers.execute(designer)

    def test_duplicate_designer_email_is_rejected(self) -> None:
        existing = DesignerAccount(
            id=uuid4(),
            email="designer@example.com",
            display_name="Existing",
            status=UserStatus.ACTIVE,
            must_change_password=False,
            created_at=datetime.now(UTC),
        )
        self.repository.accounts[existing.id] = existing

        with self.assertRaises(Conflict):
            self.create_designer.execute(
                self.admin,
                email="DESIGNER@example.com",
                display_name="Duplicate",
                temporary_password="Temporary-123!",
            )


if __name__ == "__main__":
    unittest.main()
