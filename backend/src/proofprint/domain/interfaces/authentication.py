from typing import Protocol
from uuid import UUID

from proofprint.domain.entities.identity import AuthenticationRecord, IssuedAccessToken


class AuthenticationRepository(Protocol):
    def find_by_email(self, email: str) -> AuthenticationRecord | None: ...

    def find_by_id(self, user_id: UUID) -> AuthenticationRecord | None: ...


class PasswordVerifier(Protocol):
    def verify(self, plain_password: str, password_hash: str) -> bool: ...


class AccessTokenCodec(Protocol):
    def issue(self, user_id: UUID) -> IssuedAccessToken: ...

    def decode_subject(self, token: str) -> UUID: ...
