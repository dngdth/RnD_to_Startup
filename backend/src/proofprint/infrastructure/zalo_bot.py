"""Zalo Bot Platform notification adapter and manual private-chat binding CLI."""

import argparse
import json
import re
from datetime import UTC, datetime
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen
from uuid import UUID, uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session

from proofprint.domain.entities.review_access import ReviewLinkStatus, WorkspaceReviewLink
from proofprint.infrastructure.database import SessionFactory, settings
from proofprint.infrastructure.models.identity import CustomerRow, UserRow
from proofprint.infrastructure.models.review_access import WorkspaceReviewLinkRow
from proofprint.infrastructure.models.workspace import WorkspaceMembershipRow, WorkspaceRow
from proofprint.infrastructure.models.zalo_bot import ZaloBotBindingRow
from proofprint.infrastructure.security.review_tokens import HmacReviewLinkTokenCodec

ZALO_EVENT_TYPES = frozenset(
    {"WORKSPACE_CREATED", "REVIEW_CHANGES_REQUESTED", "VERSION_RELEASED",
     "CUSTOMER_REQUEST_BATCH_SUBMITTED"}
)


class ZaloApiError(RuntimeError):
    """A Bot API call failed without exposing its token in the outbox."""


class ZaloRecipientNotBound(RuntimeError):
    """The intended recipient has not been linked to a private Bot chat."""


class ZaloRecipientMissingPhone(RuntimeError):
    """The customer has no phone lookup key."""


class ZaloDesignerNoLongerActive(RuntimeError):
    """The original Designer no longer has active Workspace access."""


def normalize_phone(value: str) -> str:
    """Use one lookup key for common Vietnamese local and +84 phone formats."""
    digits = re.sub(r"[\s.()-]", "", value.strip())
    if digits.startswith("+84"):
        digits = "0" + digits[3:]
    elif digits.startswith("84"):
        digits = "0" + digits[2:]
    if not re.fullmatch(r"0\d{8,10}", digits):
        raise ValueError("Expected a Vietnamese phone number starting with 0 or +84")
    return digits


def _bot_request(method: str, body: dict[str, Any]) -> dict[str, Any]:
    token = settings.zalo_bot_token
    if token is None or not token.get_secret_value():
        raise ZaloApiError("ZALO_BOT_TOKEN is not configured")
    request = Request(
        f"https://bot-api.zaloplatforms.com/bot{token.get_secret_value()}/{method}",
        data=json.dumps(body, ensure_ascii=False).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urlopen(request, timeout=40 if method == "getUpdates" else 10) as response:
            result = json.load(response)
    except (HTTPError, URLError, TimeoutError, ValueError) as exc:
        # HTTP exception messages can contain the URL, which embeds the Bot Token.
        raise ZaloApiError(f"Zalo {method} failed ({type(exc).__name__})") from None
    if not isinstance(result, dict) or result.get("ok") is not True:
        raise ZaloApiError(f"Zalo {method} returned an unsuccessful response")
    return result


def _one_line(value: str) -> str:
    return " ".join(value.split())


def _review_url(session: Session, workspace_id: UUID) -> str:
    row = session.scalar(
        select(WorkspaceReviewLinkRow).where(
            WorkspaceReviewLinkRow.workspace_id == workspace_id,
            WorkspaceReviewLinkRow.status == "ACTIVE",
        )
    )
    if row is None:
        raise RuntimeError("Workspace has no active review link")
    link = WorkspaceReviewLink(
        id=row.id,
        workspace_id=row.workspace_id,
        version=row.version,
        status=ReviewLinkStatus.ACTIVE,
        created_by=row.created_by,
        created_at=row.created_at,
    )
    codec = HmacReviewLinkTokenCodec(settings.review_link_secret_key.get_secret_value())
    return f"{settings.review_base_url.rstrip('/')}/review/{codec.issue(link)}"


def _message_for_event(
    session: Session, event_type: str, payload: dict[str, Any]
) -> tuple[str, str]:
    workspace_id = UUID(payload["workspace_id"])
    workspace = session.get(WorkspaceRow, workspace_id)
    if workspace is None:
        raise RuntimeError("Notification workspace was not found")
    customer = session.get(CustomerRow, workspace.customer_id)
    if customer is None:
        raise RuntimeError("Notification customer was not found")
    details = (
        f"Khách hàng: {_one_line(customer.name)}\n"
        f"Loại sản phẩm: {_one_line(workspace.product_type)}\n"
        f"Workspace: {workspace.id}"
    )
    if event_type in {"REVIEW_CHANGES_REQUESTED", "CUSTOMER_REQUEST_BATCH_SUBMITTED"}:
        designer = session.get(UserRow, workspace.created_by)
        membership = session.get(
            WorkspaceMembershipRow, (workspace.id, workspace.created_by)
        )
        if (
            designer is None or designer.status != "ACTIVE"
            or designer.system_role != "DESIGNER" or membership is None
            or membership.status != "ACTIVE" or not membership.can_view
        ):
            raise ZaloDesignerNoLongerActive("Workspace creator is not an active Designer")
        binding = session.scalar(
            select(ZaloBotBindingRow).where(ZaloBotBindingRow.user_id == workspace.created_by)
        )
        if binding is None:
            raise ZaloRecipientNotBound("Designer has no Zalo private-chat binding")
        heading = (
            f"[ProofPrint] Khách hàng đã gửi {int(payload['count'])} yêu cầu theo hạng mục."
            if event_type == "CUSTOMER_REQUEST_BATCH_SUBMITTED"
            else "[ProofPrint] Khách hàng đã yêu cầu thay đổi."
        )
        text = (
            f"{heading}\n"
            f"{details}\n"
            f"Xem Workspace:\n{settings.review_base_url.rstrip('/')}/workspaces/{workspace.id}"
        )
    elif event_type in {"WORKSPACE_CREATED", "VERSION_RELEASED"}:
        if not customer.phone:
            raise ZaloRecipientMissingPhone("Customer has no phone for Zalo binding")
        binding = session.scalar(
            select(ZaloBotBindingRow).where(
                ZaloBotBindingRow.customer_phone == normalize_phone(customer.phone)
            )
        )
        if binding is None:
            raise ZaloRecipientNotBound("Customer has no Zalo private-chat binding")
        if event_type == "WORKSPACE_CREATED":
            heading = "[ProofPrint] Workspace của bạn đã được tạo."
        else:
            number = int(payload["version_number"])
            heading = (
                f"[ProofPrint] Designer đã phát hành Version {number}. "
                "Bạn có thể xem bản cập nhật và gửi yêu cầu thay đổi."
            )
        text = f"{heading}\n{details}\nXem Workspace:\n{_review_url(session, workspace.id)}"
    else:
        raise ValueError("Unsupported Zalo notification event")
    if len(text) > 2000:
        raise RuntimeError("Zalo notification exceeds the 2000-character limit")
    return binding.chat_id, text


def deliver_zalo(_event_id: UUID, event_type: str, payload: dict[str, Any]) -> None:
    with SessionFactory() as session:
        chat_id, message = _message_for_event(session, event_type, payload)
    _bot_request("sendMessage", {"chat_id": chat_id, "text": message})


def _bind(*, email: str | None, phone: str | None, chat_id: str) -> None:
    chat_id = chat_id.strip()
    if not chat_id or len(chat_id) > 128:
        raise ValueError("chat_id must contain 1 to 128 characters")
    with SessionFactory.begin() as session:
        user_id = None
        customer_phone = None
        if email is not None:
            user = session.scalar(
                select(UserRow).where(UserRow.email.ilike(email.strip()))
            )
            if user is None or user.system_role != "DESIGNER" or user.status != "ACTIVE":
                raise ValueError("Active Designer email was not found")
            user_id = user.id
            binding = session.scalar(
                select(ZaloBotBindingRow).where(ZaloBotBindingRow.user_id == user_id)
            )
        else:
            assert phone is not None
            customer_phone = normalize_phone(phone)
            binding = session.scalar(
                select(ZaloBotBindingRow).where(
                    ZaloBotBindingRow.customer_phone == customer_phone
                )
            )
        existing_chat = session.scalar(
            select(ZaloBotBindingRow).where(ZaloBotBindingRow.chat_id == chat_id)
        )
        if existing_chat is not None and existing_chat is not binding:
            raise ValueError("chat_id is already bound to another recipient")
        if binding is None:
            session.add(
                ZaloBotBindingRow(
                    id=uuid4(), user_id=user_id,
                    customer_phone=customer_phone, chat_id=chat_id,
                )
            )
        else:
            binding.chat_id = chat_id
            binding.updated_at = datetime.now(UTC)


def _private_chat_updates(response: dict[str, Any]) -> list[tuple[str, str]]:
    result = response.get("result")
    events = result if isinstance(result, list) else [result]
    chats: dict[str, str] = {}
    for event in events:
        if not isinstance(event, dict):
            continue
        message = event.get("message")
        if not isinstance(message, dict):
            continue
        chat = message.get("chat")
        sender = message.get("from")
        if not isinstance(chat, dict) or chat.get("chat_type") != "PRIVATE":
            continue
        chat_id = chat.get("id")
        if isinstance(chat_id, str) and chat_id:
            name = sender.get("display_name", "") if isinstance(sender, dict) else ""
            chats[chat_id] = _one_line(str(name))
    return list(chats.items())


def main() -> None:
    parser = argparse.ArgumentParser(description="Manage manually verified Zalo Bot chats")
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("updates", help="Show private chat IDs from recent Bot messages")
    designer = sub.add_parser("bind-designer")
    designer.add_argument("--email", required=True)
    designer.add_argument("--chat-id", required=True)
    customer = sub.add_parser("bind-customer")
    customer.add_argument("--phone", required=True)
    customer.add_argument("--chat-id", required=True)
    args = parser.parse_args()
    if args.command == "updates":
        try:
            chats = _private_chat_updates(_bot_request("getUpdates", {"timeout": 0}))
        except RuntimeError as exc:
            parser.error(str(exc))
        if not chats:
            print("No private chats found. Ask each person to message the Bot, then retry.")
        for chat_id, name in chats:
            print(f"chat_id={chat_id}  display_name={name}")
    else:
        try:
            _bind(
                email=args.email if args.command == "bind-designer" else None,
                phone=args.phone if args.command == "bind-customer" else None,
                chat_id=args.chat_id,
            )
        except ValueError as exc:
            parser.error(str(exc))
        print("Zalo private chat binding saved")


if __name__ == "__main__":
    main()
