from pwdlib import PasswordHash
from pwdlib.exceptions import PwdlibError


class Argon2PasswordVerifier:
    def __init__(self) -> None:
        self._password_hash = PasswordHash.recommended()

    def verify(self, plain_password: str, password_hash: str) -> bool:
        try:
            return self._password_hash.verify(plain_password, password_hash)
        except (PwdlibError, TypeError, ValueError):
            return False
