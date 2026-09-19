from proofprint.domain.entities.identity import IssuedAccessToken, UserStatus
from proofprint.domain.exceptions import AuthenticationRequired
from proofprint.domain.interfaces.authentication import (
    AccessTokenCodec,
    AuthenticationRepository,
    PasswordVerifier,
)

# Verification still runs for unknown emails so the common failure path does not reveal
# whether an account exists through a large timing difference.
DUMMY_PASSWORD_HASH = (
    "$argon2id$v=19$m=65536,t=3,p=4$uFIQ9+ll3uQhQnMK0EZESA$"
    "1c8hHg1CbthXVZLfPuNEzNgdJQ0GwrQn73/DuuAfWi8"
)


class AuthenticateUser:
    def __init__(
        self,
        users: AuthenticationRepository,
        passwords: PasswordVerifier,
        tokens: AccessTokenCodec,
    ) -> None:
        self.users = users
        self.passwords = passwords
        self.tokens = tokens

    def execute(self, *, email: str, password: str) -> IssuedAccessToken:
        normalized_email = email.strip().lower()
        record = self.users.find_by_email(normalized_email)
        password_hash = record.password_hash if record is not None else DUMMY_PASSWORD_HASH
        password_matches = self.passwords.verify(password, password_hash)

        if record is None or not password_matches or record.status != UserStatus.ACTIVE:
            raise AuthenticationRequired("Email or password is incorrect")
        return self.tokens.issue(record.id)
