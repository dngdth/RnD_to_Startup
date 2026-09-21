from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from proofprint.domain.entities.identity import DesignerAccount, UserStatus


class CreateDesignerRequest(BaseModel):
    email: str = Field(min_length=3, max_length=320)
    display_name: str = Field(min_length=1, max_length=200)
    temporary_password: str = Field(min_length=8, max_length=128)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return value.strip().lower()

    @field_validator("display_name")
    @classmethod
    def normalize_display_name(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("display_name must not be blank")
        return normalized


class UpdateDesignerStatusRequest(BaseModel):
    status: UserStatus


class DesignerAccountResponse(BaseModel):
    id: UUID
    email: str
    display_name: str
    status: UserStatus
    must_change_password: bool
    created_at: datetime

    @classmethod
    def from_domain(cls, account: DesignerAccount) -> "DesignerAccountResponse":
        return cls(
            id=account.id,
            email=account.email,
            display_name=account.display_name,
            status=account.status,
            must_change_password=account.must_change_password,
            created_at=account.created_at,
        )
