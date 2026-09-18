from uuid import UUID

from proofprint.core.errors import AuthenticationRequired
from proofprint.modules.identity.domain import (
    AccessTokenCodec,
    AuthenticationRepository,
    CurrentActor,
    IssuedAccessToken,
    PasswordVerifier,
    UserStatus,
)

# Verification still runs for unknown emails so the common failure path does not reveal
# whether an account exists through a large timing difference.
DUMMY_PASSWORD_HASH = (
    "$argon2id$v=19$m=65536,t=3,p=4$uFIQ9+ll3uQhQnMK0EZESA$"
    "1c8hHg1CbthXVZLfPuNEzNgdJQ0GwrQn73/DuuAfWi8"
)


class AuthenticationService:
    def __init__(
        self,
        users: AuthenticationRepository,
        passwords: PasswordVerifier,
        tokens: AccessTokenCodec,
    ) -> None:
        self.users = users
        self.passwords = passwords
        self.tokens = tokens

    def login(self, *, email: str, password: str) -> IssuedAccessToken:
        normalized_email = email.strip().lower()
        record = self.users.find_by_email(normalized_email)
        password_hash = record.password_hash if record is not None else DUMMY_PASSWORD_HASH
        password_matches = self.passwords.verify(password, password_hash)

        if record is None or not password_matches or record.status != UserStatus.ACTIVE:
            raise AuthenticationRequired("Email or password is incorrect")
        return self.tokens.issue(record.id)

    def resolve_actor(self, token: str) -> CurrentActor:
        user_id: UUID = self.tokens.decode_subject(token)
        record = self.users.find_by_id(user_id)
        if record is None or record.status != UserStatus.ACTIVE:
            raise AuthenticationRequired("Access token is no longer valid")
        return record.as_actor()
