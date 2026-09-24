from datetime import UTC, datetime, timedelta
from types import SimpleNamespace
from uuid import uuid4

from fastapi import Response

from proofprint.presentation.api.routers.guest import create_guest_session, revoke_guest_session
from proofprint.presentation.schemas.guest import CreateGuestSessionRequest


def test_guest_cookie_reaches_workspace_review_routes() -> None:
    """Guest review routes live under /workspaces and /change-requests too."""
    response = Response()
    created = SimpleNamespace(
        raw_session_token="session-token",
        expires_at=datetime.now(UTC) + timedelta(hours=1),
        principal=SimpleNamespace(workspace_id=uuid4(), username="Customer"),
    )
    use_case = SimpleNamespace(execute=lambda **_kwargs: created)

    create_guest_session(
        CreateGuestSessionRequest(review_token="x" * 20, username="Customer"),
        response,
        use_case,
    )

    cookie = response.headers["set-cookie"]
    assert "Path=/api/v1;" in cookie
    assert "HttpOnly" in cookie


def test_guest_logout_clears_scoped_cookie() -> None:
    response = Response()
    revoked: list[object] = []
    guest = SimpleNamespace(session_id=uuid4())
    revoke_guest_session(response, guest, SimpleNamespace(execute=revoked.append))
    assert revoked == [guest]
    cookie = response.headers["set-cookie"]
    assert "Path=/api/v1;" in cookie
    assert "Max-Age=0" in cookie
