from typing import Protocol
from uuid import UUID

from proofprint.domain.entities.identity import (
    AuthenticationRecord,
    DesignerAccount,
    IssuedAccessToken,
    UserStatus,
)


class AuthenticationRepository(Protocol):
    def find_by_email(self, email: str) -> AuthenticationRecord | None: ...

    def find_by_id(self, user_id: UUID) -> AuthenticationRecord | None: ...


class PasswordVerifier(Protocol):
    def verify(self, plain_password: str, password_hash: str) -> bool: ...


class PasswordHasher(Protocol):
    def hash(self, plain_password: str) -> str: ...


class AccessTokenCodec(Protocol):
    def issue(self, user_id: UUID) -> IssuedAccessToken: ...

    def decode_subject(self, token: str) -> UUID: ...


class DesignerAccountRepository(Protocol):
    def list_designers(self) -> list[DesignerAccount]: ...

    def find_designer(self, user_id: UUID) -> DesignerAccount | None: ...

    def email_exists(self, email: str) -> bool: ...

    def phone_exists(self, phone: str) -> bool: ...

    def add_designer(self, account: DesignerAccount, *, password_hash: str) -> None: ...

    def set_designer_status(self, user_id: UUID, status: UserStatus) -> None: ...

    def update_designer(
        self, user_id: UUID, *, display_name: str | None = None,
        email: str | None = None, phone: str | None = None
    ) -> DesignerAccount | None: ...
