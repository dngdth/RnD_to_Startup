from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from proofprint.domain.entities.identity import DesignerAccount, UserStatus
from proofprint.infrastructure.models import UserCredentialRow, UserRow


class SqlAlchemyDesignerAccountRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def list_designers(self) -> list[DesignerAccount]:
        statement = (
            select(UserRow, UserCredentialRow)
            .join(UserCredentialRow, UserCredentialRow.user_id == UserRow.id)
            .where(UserRow.system_role == "DESIGNER")
            .order_by(UserRow.created_at.desc(), UserRow.id)
        )
        return [
            self._account(user, credential)
            for user, credential in self.session.execute(statement)
        ]

    def find_designer(self, user_id: UUID) -> DesignerAccount | None:
        statement = (
            select(UserRow, UserCredentialRow)
            .join(UserCredentialRow, UserCredentialRow.user_id == UserRow.id)
            .where(UserRow.id == user_id, UserRow.system_role == "DESIGNER")
        )
        row = self.session.execute(statement).one_or_none()
        return self._account(*row) if row is not None else None

    def email_exists(self, email: str) -> bool:
        statement = select(UserRow.id).where(func.lower(UserRow.email) == email.lower())
        return self.session.scalar(statement) is not None

    def add_designer(self, account: DesignerAccount, *, password_hash: str) -> None:
        self.session.add(
            UserRow(
                id=account.id,
                email=account.email,
                display_name=account.display_name,
                system_role="DESIGNER",
                status=account.status.value,
                created_at=account.created_at,
            )
        )
        self.session.add(
            UserCredentialRow(
                user_id=account.id,
                password_hash=password_hash,
                must_change_password=account.must_change_password,
                password_changed_at=account.created_at,
                created_at=account.created_at,
                updated_at=account.created_at,
            )
        )
        self.session.flush()

    def set_designer_status(self, user_id: UUID, status: UserStatus) -> None:
        user = self.session.get(UserRow, user_id)
        if user is not None and user.system_role == "DESIGNER":
            user.status = status.value
            self.session.flush()

    @staticmethod
    def _account(user: UserRow, credential: UserCredentialRow) -> DesignerAccount:
        return DesignerAccount(
            id=user.id,
            email=user.email,
            display_name=user.display_name,
            status=UserStatus(user.status),
            must_change_password=credential.must_change_password,
            created_at=user.created_at,
        )
