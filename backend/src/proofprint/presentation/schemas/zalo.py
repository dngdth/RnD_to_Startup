from datetime import datetime

from pydantic import BaseModel

from proofprint.domain.entities.zalo import IssuedZaloLinkCode, ZaloLinkStatus


class ZaloLinkStatusResponse(BaseModel):
    linked: bool
    chat_display_name: str | None
    linked_at: datetime | None

    @classmethod
    def from_domain(cls, status: ZaloLinkStatus) -> "ZaloLinkStatusResponse":
        return cls(
            linked=status.linked,
            chat_display_name=status.chat_display_name,
            linked_at=status.linked_at,
        )


class ZaloLinkCodeResponse(BaseModel):
    code: str
    expires_at: datetime
    principal_type: str

    @classmethod
    def from_domain(cls, issued: IssuedZaloLinkCode) -> "ZaloLinkCodeResponse":
        return cls(
            code=issued.code,
            expires_at=issued.expires_at,
            principal_type=issued.principal_type.value,
        )

