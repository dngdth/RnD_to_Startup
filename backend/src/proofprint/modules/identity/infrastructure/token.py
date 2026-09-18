from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

import jwt

from proofprint.core.errors import AuthenticationRequired
from proofprint.modules.identity.domain import IssuedAccessToken


class JwtAccessTokenCodec:
    def __init__(self, *, secret_key: str, issuer: str, ttl_minutes: int) -> None:
        self.secret_key = secret_key
        self.issuer = issuer
        self.ttl = timedelta(minutes=ttl_minutes)

    def issue(self, user_id: UUID) -> IssuedAccessToken:
        issued_at = datetime.now(UTC)
        expires_at = issued_at + self.ttl
        payload = {
            "sub": str(user_id),
            "type": "access",
            "iss": self.issuer,
            "iat": issued_at,
            "exp": expires_at,
            "jti": str(uuid4()),
        }
        encoded = jwt.encode(payload, self.secret_key, algorithm="HS256")
        return IssuedAccessToken(value=encoded, expires_at=expires_at)

    def decode_subject(self, token: str) -> UUID:
        try:
            payload = jwt.decode(
                token,
                self.secret_key,
                algorithms=["HS256"],
                issuer=self.issuer,
                options={"require": ["sub", "type", "iss", "iat", "exp", "jti"]},
            )
            if payload["type"] != "access":
                raise AuthenticationRequired("Invalid access token")
            return UUID(payload["sub"])
        except (jwt.InvalidTokenError, KeyError, TypeError, ValueError) as exc:
            raise AuthenticationRequired("Invalid or expired access token") from exc
