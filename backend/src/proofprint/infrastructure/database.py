from collections.abc import Iterator

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

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
    asset_attestation_secret_key: SecretStr = Field(
        default=SecretStr("development-asset-attestation-secret-change-this"), min_length=32
    )
    asset_allowed_content_types: str = "image/png,image/jpeg,application/pdf"
    notification_webhook_url: str | None = None
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


settings = Settings()
engine = create_engine(settings.database_url, pool_pre_ping=True)
SessionFactory = sessionmaker(bind=engine, expire_on_commit=False)


def get_session() -> Iterator[Session]:
    with SessionFactory() as session:
        yield session
