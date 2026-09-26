import hashlib
import hmac
import secrets


class HmacZaloLinkCodeService:
    _alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"

    def __init__(self, secret_key: str) -> None:
        self.secret_key = secret_key.encode("utf-8")

    @staticmethod
    def _canonical(code: str) -> str:
        return "".join(character for character in code.upper() if character.isalnum())

    def issue(self) -> tuple[str, str]:
        raw = "".join(secrets.choice(self._alphabet) for _ in range(8))
        display = f"PP-{raw[:4]}-{raw[4:]}"
        return display, self.hash(display)

    def hash(self, code: str) -> str:
        return hmac.new(
            self.secret_key,
            self._canonical(code).encode("ascii", errors="ignore"),
            hashlib.sha256,
        ).hexdigest()

