from collections.abc import Iterator
from typing import Literal
from urllib.parse import urlparse

from pydantic import Field, SecretStr, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    deployment_mode: Literal["development", "production"] = "development"
    database_url: str = "postgresql+psycopg://proofprint:proofprint@127.0.0.1:55432/proofprint"
    auth_secret_key: SecretStr = Field(
        default=SecretStr("development-only-change-this-secret-before-production"),
        min_length=32,
    )
    auth_token_ttl_minutes: int = Field(default=30, ge=5, le=1440)
    auth_issuer: str = "proofprint"
    review_link_secret_key: SecretStr = Field(
        default=SecretStr("development-review-link-secret-change-this"),
        min_length=32,
    )
    zalo_link_secret_key: SecretStr = Field(
        default=SecretStr("development-zalo-link-secret-change-this"),
        min_length=32,
    )
    zalo_link_code_ttl_minutes: int = Field(default=10, ge=2, le=60)
    asset_attestation_secret_key: SecretStr = Field(
        default=SecretStr("development-asset-attestation-secret-change-this"), min_length=32
    )
    asset_allowed_content_types: str = "image/png,image/jpeg,application/pdf"
    notification_webhook_url: str | None = None
    zalo_bot_token: SecretStr | None = None
    gemini_api_key: SecretStr | None = None
    gemini_summary_model: str = "gemini-3.8-flash"
    gemini_summary_max_images: int = Field(default=8, ge=0, le=20)
    notification_webhook_secret_key: SecretStr = Field(
        default=SecretStr("development-notification-webhook-secret-change-this"),
        min_length=32,
    )
    review_base_url: str = "http://127.0.0.1:3000"
    guest_session_ttl_hours: int = Field(default=24, ge=1, le=720)
    guest_session_cookie_name: str = "proofprint_guest_session"
    guest_session_cookie_secure: bool = False
    cors_origins: str = "http://127.0.0.1:3000,http://localhost:3000"

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @model_validator(mode="after")
    def require_secure_production_settings(self) -> "Settings":
        if self.deployment_mode != "production":
            return self
        development_secrets = {
            "development-only-change-this-secret-before-production",
            "development-review-link-secret-change-this",
            "development-asset-attestation-secret-change-this",
            "development-notification-webhook-secret-change-this",
            "development-zalo-link-secret-change-this",
        }
        secrets = (
            self.auth_secret_key, self.review_link_secret_key,
            self.asset_attestation_secret_key, self.notification_webhook_secret_key,
            self.zalo_link_secret_key,
        )
        if any(
            secret.get_secret_value() in development_secrets
            or secret.get_secret_value().startswith("replace-with-")
            for secret in secrets
        ):
            raise ValueError("Production requires distinct non-default secrets")
        if len({secret.get_secret_value() for secret in secrets}) != len(secrets):
            raise ValueError("Production secrets must be distinct")
        if not self.guest_session_cookie_secure:
            raise ValueError("Production guest cookies must be Secure")
        if self.database_url == "postgresql+psycopg://proofprint:proofprint@127.0.0.1:55432/proofprint":
            raise ValueError("Production requires a configured database URL")
        if urlparse(self.review_base_url).scheme != "https":
            raise ValueError("Production review URL must use HTTPS")
        if not self.cors_origin_list or any(
            urlparse(origin).scheme != "https" for origin in self.cors_origin_list
        ):
            raise ValueError("Production CORS origins must use HTTPS")
        return self


settings = Settings()
engine = create_engine(settings.database_url, pool_pre_ping=True)
SessionFactory = sessionmaker(bind=engine, expire_on_commit=False)


def get_session() -> Iterator[Session]:
    with SessionFactory() as session:
        yield session
