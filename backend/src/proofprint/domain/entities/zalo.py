from dataclasses import dataclass
from datetime import datetime
from enum import StrEnum
from uuid import UUID


class ZaloPrincipalType(StrEnum):
    DESIGNER = "DESIGNER"
    CUSTOMER = "CUSTOMER"


@dataclass(frozen=True, slots=True)
class ZaloBinding:
    id: UUID
    user_id: UUID | None
    customer_id: UUID | None
    chat_id: str
    zalo_display_name: str | None
    created_at: datetime
    updated_at: datetime


@dataclass(frozen=True, slots=True)
class ZaloLinkToken:
    id: UUID
    principal_type: ZaloPrincipalType
    user_id: UUID | None
    customer_id: UUID | None
    token_hash: str
    expires_at: datetime
    consumed_at: datetime | None
    created_by: UUID
    created_at: datetime


@dataclass(frozen=True, slots=True)
class ZaloLinkStatus:
    linked: bool
    chat_display_name: str | None
    linked_at: datetime | None


@dataclass(frozen=True, slots=True)
class IssuedZaloLinkCode:
    code: str
    expires_at: datetime
    principal_type: ZaloPrincipalType

