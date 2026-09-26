import unittest

from proofprint.infrastructure.database import Settings


class ProductionSettingsTests(unittest.TestCase):
    def test_production_rejects_development_defaults(self) -> None:
        with self.assertRaises(ValueError):
            Settings(deployment_mode="production")

    def test_production_requires_secure_cookie_and_https(self) -> None:
        options = {
            "deployment_mode": "production",
            "database_url": "postgresql+psycopg://app:secret@db.example.com/proofprint",
            "auth_secret_key": "a" * 40,
            "review_link_secret_key": "b" * 40,
            "asset_attestation_secret_key": "c" * 40,
            "notification_webhook_secret_key": "d" * 40,
            "zalo_link_secret_key": "e" * 40,
            "review_base_url": "https://proofprint.example.com",
            "cors_origins": "https://proofprint.example.com",
        }
        with self.assertRaisesRegex(ValueError, "Secure"):
            Settings(**options, guest_session_cookie_secure=False)
        configured = Settings(**options, guest_session_cookie_secure=True)
        self.assertEqual(configured.deployment_mode, "production")
