"""Zalo Bot notifications and one-time-code private-chat linking worker."""

import argparse
import json
import re
from queue import Empty, Queue
from threading import Event, Thread
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from proofprint.application.use_cases.manage_zalo_links import ConsumeZaloLinkCode
from proofprint.domain.entities.review_access import ReviewLinkStatus, WorkspaceReviewLink
from proofprint.domain.exceptions import ApplicationError
from proofprint.infrastructure.ai_version_summary import generate_version_summary
from proofprint.infrastructure.database import SessionFactory, settings
from proofprint.infrastructure.models.identity import CustomerRow, UserRow
from proofprint.infrastructure.models.review_access import WorkspaceReviewLinkRow
from proofprint.infrastructure.models.workspace import WorkspaceMembershipRow, WorkspaceRow
from proofprint.infrastructure.models.zalo_bot import ZaloBotBindingRow
from proofprint.infrastructure.repositories.zalo import SqlAlchemyZaloLinkRepository
from proofprint.infrastructure.security.review_tokens import HmacReviewLinkTokenCodec
from proofprint.infrastructure.security.zalo_link_codes import HmacZaloLinkCodeService
from proofprint.infrastructure.unit_of_work import SqlAlchemyUnitOfWork

ZALO_EVENT_TYPES = frozenset(
    {"WORKSPACE_CREATED", "REVIEW_CHANGES_REQUESTED", "VERSION_RELEASED",
     "CUSTOMER_REQUEST_BATCH_SUBMITTED"}
)
ZALO_LINK_HANDLER_COUNT = 4


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
        designer_id = workspace.assigned_designer_id
        designer = session.get(UserRow, designer_id)
        membership = session.get(
            WorkspaceMembershipRow, (workspace.id, designer_id)
        )
        if (
            designer is None or designer.status != "ACTIVE"
            or designer.system_role != "DESIGNER" or membership is None
            or membership.status != "ACTIVE" or not membership.can_view
        ):
            raise ZaloDesignerNoLongerActive(
                "Assigned Workspace Designer is not active"
            )
        binding = session.scalar(
            select(ZaloBotBindingRow).where(ZaloBotBindingRow.user_id == designer_id)
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
        binding = session.scalar(
            select(ZaloBotBindingRow).where(
                ZaloBotBindingRow.customer_id == customer.id
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
        if event_type == "VERSION_RELEASED":
            messages = _version_release_messages(session, payload)
        else:
            messages = [_message_for_event(session, event_type, payload)]
    for chat_id, message in messages:
        _bot_request("sendMessage", {"chat_id": chat_id, "text": message})


def _version_release_messages(
    session: Session,
    payload: dict[str, Any],
) -> list[tuple[str, str]]:
    workspace_id = UUID(payload["workspace_id"])
    version_id = UUID(payload["version_id"])
    version_number = int(payload["version_number"])
    workspace = session.get(WorkspaceRow, workspace_id)
    if workspace is None:
        raise RuntimeError("Notification workspace was not found")
    customer = session.get(CustomerRow, workspace.customer_id)
    if customer is None:
        raise RuntimeError("Notification customer was not found")

    summary = generate_version_summary(
        session,
        workspace_id=workspace_id,
        version_id=version_id,
    )
    summary_heading = "AI tóm tắt thay đổi" if summary.generated_by_ai else "Tóm tắt thay đổi"
    details = (
        f"Khách hàng: {_one_line(customer.name)}\n"
        f"Loại sản phẩm: {_one_line(workspace.product_type)}\n"
        f"{summary_heading}: {summary.text}"
    )
    messages: list[tuple[str, str]] = []

    customer_binding = session.scalar(
        select(ZaloBotBindingRow).where(ZaloBotBindingRow.customer_id == customer.id)
    )
    if customer_binding is not None:
        messages.append(
            (
                customer_binding.chat_id,
                (
                    f"[ProofPrint] Designer đã phát hành Version {version_number}.\n"
                    f"{details}\nXem và phản hồi:\n{_review_url(session, workspace_id)}"
                ),
            )
        )

    designer_id = workspace.assigned_designer_id
    designer = session.get(UserRow, designer_id)
    membership = session.get(WorkspaceMembershipRow, (workspace_id, designer_id))
    designer_binding = session.scalar(
        select(ZaloBotBindingRow).where(ZaloBotBindingRow.user_id == designer_id)
    )
    if (
        designer is not None
        and designer.status == "ACTIVE"
        and designer.system_role == "DESIGNER"
        and membership is not None
        and membership.status == "ACTIVE"
        and membership.can_view
        and designer_binding is not None
    ):
        messages.append(
            (
                designer_binding.chat_id,
                (
                    f"[ProofPrint] Version {version_number} đã được phát hành.\n"
                    f"{details}\nXem Workspace:\n"
                    f"{settings.review_base_url.rstrip('/')}/workspaces/{workspace_id}"
                ),
            )
        )
    if not messages:
        raise ZaloRecipientNotBound(
            "Version recipients have no Zalo private-chat binding"
        )
    if any(len(message) > 2000 for _, message in messages):
        raise RuntimeError("Zalo notification exceeds the 2000-character limit")
    return messages


def _private_chat_updates(response: dict[str, Any]) -> list[tuple[str, str]]:
    chats: dict[str, str] = {}
    for chat_id, name, _text in _private_chat_messages(response):
        chats[chat_id] = name
    return list(chats.items())


def _private_chat_messages(response: dict[str, Any]) -> list[tuple[str, str, str]]:
    result = response.get("result")
    events = result if isinstance(result, list) else [result]
    messages: list[tuple[str, str, str]] = []
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
            text_value = message.get("text", "")
            messages.append(
                (chat_id, _one_line(str(name)), str(text_value).strip())
            )
    return messages


def _consume_link_code(code: str, chat_id: str, display_name: str) -> str:
    with SessionFactory() as session:
        use_case = ConsumeZaloLinkCode(
            SqlAlchemyZaloLinkRepository(session),
            HmacZaloLinkCodeService(settings.zalo_link_secret_key.get_secret_value()),
            SqlAlchemyUnitOfWork(session),
        )
        principal = use_case.execute(
            code=code, chat_id=chat_id, display_name=display_name
        )
    return principal.value


def _process_link_updates(response: dict[str, Any]) -> int:
    processed = 0
    for chat_id, display_name, text_value in _private_chat_messages(response):
        match = re.search(r"\bPP-[A-Z0-9]{4}-[A-Z0-9]{4}\b", text_value.upper())
        if match is None:
            continue
        try:
            principal = _consume_link_code(match.group(0), chat_id, display_name)
            reply = (
                "Liên kết ProofPrint thành công. "
                f"Vai trò đã xác nhận: {'Designer' if principal == 'DESIGNER' else 'Khách hàng'}."
            )
        except ApplicationError as exc:
            reply = f"Không thể liên kết ProofPrint: {exc}"
        _bot_request("sendMessage", {"chat_id": chat_id, "text": reply})
        processed += 1
    return processed


def _run_link_handler(
    responses: Queue[dict[str, Any]],
    stop_event: Event,
) -> None:
    """Process received updates without delaying the single Zalo poller."""
    while not stop_event.is_set() or not responses.empty():
        try:
            response = responses.get(timeout=0.2)
        except Empty:
            continue
        try:
            count = _process_link_updates(response)
            if count:
                print(f"Processed {count} Zalo link request(s)", flush=True)
        except (RuntimeError, ApplicationError) as exc:
            print(f"Zalo link handler error: {exc}", flush=True)
        finally:
            responses.task_done()


def listen_for_link_codes(
    stop_event: Event | None = None,
    *,
    once: bool = False,
) -> None:
    """Long-poll Zalo once and dispatch updates to parallel local handlers."""
    stop_event = stop_event or Event()
    if once:
        try:
            count = _process_link_updates(_bot_request("getUpdates", {"timeout": 30}))
            if count:
                print(f"Processed {count} Zalo link request(s)", flush=True)
        except (RuntimeError, ApplicationError) as exc:
            print(f"Zalo linking worker error: {exc}", flush=True)
            raise SystemExit(1) from exc
        return

    responses: Queue[dict[str, Any]] = Queue(maxsize=100)
    handlers = [
        Thread(
            target=_run_link_handler,
            args=(responses, stop_event),
            name=f"proofprint-zalo-link-handler-{index + 1}",
            daemon=True,
        )
        for index in range(ZALO_LINK_HANDLER_COUNT)
    ]
    for handler in handlers:
        handler.start()

    try:
        while not stop_event.is_set():
            try:
                # Zalo permits a single long-poll receiver per Bot Token. Queue the
                # response immediately so database work and replies happen elsewhere.
                responses.put(_bot_request("getUpdates", {"timeout": 30}))
            except (RuntimeError, ApplicationError) as exc:
                print(f"Zalo linking worker error: {exc}", flush=True)
                if stop_event.wait(5):
                    break
    finally:
        stop_event.set()
        for handler in handlers:
            handler.join(timeout=1)


def main() -> None:
    parser = argparse.ArgumentParser(description="Run ProofPrint Zalo Bot linking")
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("updates", help="Show private chat IDs from recent Bot messages")
    listen = sub.add_parser("listen", help="Long-poll and consume one-time link codes")
    listen.add_argument("--once", action="store_true")
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
        listen_for_link_codes(once=args.once)


if __name__ == "__main__":
    main()
