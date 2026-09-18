from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from proofprint.infrastructure.models import UserCredentialRow, UserRow
from proofprint.modules.identity.domain import AuthenticationRecord, SystemRole, UserStatus


class SqlAlchemyAuthenticationRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def find_by_email(self, email: str) -> AuthenticationRecord | None:
        statement = (
            select(UserRow, UserCredentialRow)
            .join(UserCredentialRow, UserCredentialRow.user_id == UserRow.id)
            .where(func.lower(UserRow.email) == email.lower())
        )
        row = self.session.execute(statement).one_or_none()
        return self._record(row) if row is not None else None

    def find_by_id(self, user_id: UUID) -> AuthenticationRecord | None:
        statement = (
            select(UserRow, UserCredentialRow)
            .join(UserCredentialRow, UserCredentialRow.user_id == UserRow.id)
            .where(UserRow.id == user_id)
        )
        row = self.session.execute(statement).one_or_none()
        return self._record(row) if row is not None else None

    @staticmethod
    def _record(row: tuple[UserRow, UserCredentialRow]) -> AuthenticationRecord:
        user, credential = row
        return AuthenticationRecord(
            id=user.id,
            email=user.email,
            display_name=user.display_name,
            system_role=SystemRole(user.system_role),
            status=UserStatus(user.status),
            password_hash=credential.password_hash,
            must_change_password=credential.must_change_password,
        )
