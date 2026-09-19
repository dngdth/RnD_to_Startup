import hashlib
import hmac
import secrets
from uuid import UUID

from proofprint.domain.entities.review_access import WorkspaceReviewLink


class HmacReviewLinkTokenCodec:
    def __init__(self, secret_key: str) -> None:
        self._secret = secret_key.encode("utf-8")

    def issue(self, link: WorkspaceReviewLink) -> str:
        signature = hmac.new(self._secret, self._payload(link), hashlib.sha256).hexdigest()
        return f"{link.id}.{signature}"

    def decode_link_id(self, token: str) -> UUID | None:
        try:
            raw_id, _signature = token.split(".", maxsplit=1)
            return UUID(raw_id)
        except (TypeError, ValueError):
            return None

    def verify(self, token: str, link: WorkspaceReviewLink) -> bool:
        return hmac.compare_digest(token, self.issue(link))

    @staticmethod
    def _payload(link: WorkspaceReviewLink) -> bytes:
        return f"{link.id}:{link.workspace_id}:{link.version}".encode()


class OpaqueGuestSessionTokenService:
    def issue(self) -> tuple[str, str]:
        raw_token = secrets.token_urlsafe(32)
        return raw_token, self.hash(raw_token)

    def hash(self, token: str) -> str:
        return hashlib.sha256(token.encode("utf-8")).hexdigest()
