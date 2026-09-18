import unittest
from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

from pwdlib import PasswordHash

from proofprint.application.authentication import AuthenticationService
from proofprint.domain.errors import AuthenticationRequired
from proofprint.domain.identity import AuthenticationRecord, SystemRole, UserStatus
from proofprint.infrastructure.security import Argon2PasswordVerifier, JwtAccessTokenCodec


class InMemoryAuthenticationRepository:
    def __init__(self, records: list[AuthenticationRecord]) -> None:
        self.records = {record.id: record for record in records}

    def find_by_email(self, email: str) -> AuthenticationRecord | None:
        return next(
            (record for record in self.records.values() if record.email.lower() == email.lower()),
            None,
        )

    def find_by_id(self, user_id: UUID) -> AuthenticationRecord | None:
        return self.records.get(user_id)


class AuthenticationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.user_id = uuid4()
        cls.password = "Correct-Horse-123!"
        cls.record = AuthenticationRecord(
            id=cls.user_id,
            email="designer@example.com",
            display_name="Designer",
            system_role=SystemRole.DESIGNER,
            status=UserStatus.ACTIVE,
            password_hash=PasswordHash.recommended().hash(cls.password),
            must_change_password=False,
        )

    def service(self, records: list[AuthenticationRecord] | None = None) -> AuthenticationService:
        return AuthenticationService(
            InMemoryAuthenticationRepository(records or [self.record]),
            Argon2PasswordVerifier(),
            JwtAccessTokenCodec(secret_key="test-secret-key-with-at-least-32-bytes", issuer="test", ttl_minutes=30),
        )

    def test_login_issues_token_and_resolves_current_actor(self) -> None:
        service = self.service()

        issued = service.login(email="  DESIGNER@example.com ", password=self.password)
        actor = service.resolve_actor(issued.value)

        self.assertEqual(actor.id, self.user_id)
        self.assertEqual(actor.system_role, SystemRole.DESIGNER)
        self.assertGreater(issued.expires_at, datetime.now(UTC) + timedelta(minutes=29))

    def test_login_uses_same_public_error_for_unknown_email_and_wrong_password(self) -> None:
        service = self.service()

        for email, password in (
            ("missing@example.com", self.password),
            (self.record.email, "Wrong-password-123!"),
        ):
            with self.subTest(email=email), self.assertRaisesRegex(
                AuthenticationRequired, "Email or password is incorrect"
            ):
                service.login(email=email, password=password)

    def test_disabled_user_cannot_login_or_keep_using_an_existing_token(self) -> None:
        service = self.service()
        issued = service.login(email=self.record.email, password=self.password)
        disabled = AuthenticationRecord(
            id=self.record.id,
            email=self.record.email,
            display_name=self.record.display_name,
            system_role=self.record.system_role,
            status=UserStatus.DISABLED,
            password_hash=self.record.password_hash,
            must_change_password=False,
        )
        disabled_service = self.service([disabled])

        with self.assertRaises(AuthenticationRequired):
            disabled_service.login(email=disabled.email, password=self.password)
        with self.assertRaises(AuthenticationRequired):
            disabled_service.resolve_actor(issued.value)

    def test_tampered_token_is_rejected(self) -> None:
        service = self.service()
        issued = service.login(email=self.record.email, password=self.password)

        with self.assertRaises(AuthenticationRequired):
            service.resolve_actor(f"{issued.value}tampered")


if __name__ == "__main__":
    unittest.main()
