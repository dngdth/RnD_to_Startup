"""At-least-once delivery of committed outbox events to a notification webhook."""

import argparse
import hashlib
import hmac
import json
import time
from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from typing import Any
from urllib.request import Request, urlopen
from uuid import UUID

from sqlalchemy import and_, or_, select
from sqlalchemy.orm import Session, sessionmaker

from proofprint.infrastructure.database import SessionFactory, settings
from proofprint.infrastructure.models.event import OutboxMessageRow

Delivery = Callable[[UUID, str, dict[str, Any]], None]


class OutboxDispatcher:
    def __init__(self, sessions: sessionmaker[Session], deliver: Delivery) -> None:
        self.sessions = sessions
        self.deliver = deliver

    def dispatch_one(self) -> bool:
        now = datetime.now(UTC)
        with self.sessions.begin() as session:
            row = session.scalar(
                select(OutboxMessageRow)
                .where(
                    or_(
                        OutboxMessageRow.status == "PENDING",
                        and_(
                            OutboxMessageRow.status == "FAILED",
                            OutboxMessageRow.locked_at < now - timedelta(seconds=30),
                        ),
                        and_(
                            OutboxMessageRow.status == "PROCESSING",
                            OutboxMessageRow.locked_at < now - timedelta(minutes=5),
                        ),
                    )
                )
                .order_by(OutboxMessageRow.created_at, OutboxMessageRow.id)
                .with_for_update(skip_locked=True)
                .limit(1)
            )
            if row is None:
                return False
            row.status = "PROCESSING"
            row.locked_at = now
            row.attempt_count += 1
            event_id, event_type, payload = row.id, row.event_type, row.payload

        try:
            self.deliver(event_id, event_type, payload)
        except Exception as exc:  # noqa: BLE001 - delivery failures must stay in the outbox
            with self.sessions.begin() as session:
                row = session.get(OutboxMessageRow, event_id)
                if row is not None and row.status == "PROCESSING" and row.locked_at == now:
                    row.status = "FAILED"
                    row.last_error = type(exc).__name__[:500]
            return True

        with self.sessions.begin() as session:
            row = session.get(OutboxMessageRow, event_id)
            if row is not None and row.status == "PROCESSING" and row.locked_at == now:
                row.status = "PROCESSED"
                row.processed_at = datetime.now(UTC)
                row.locked_at = None
                row.last_error = None
        return True


def deliver_webhook(event_id: UUID, event_type: str, payload: dict[str, Any]) -> None:
    if not settings.notification_webhook_url:
        raise RuntimeError("NOTIFICATION_WEBHOOK_URL must be configured")
    body = json.dumps(
        {"event_id": str(event_id), "event_type": event_type, "payload": payload},
        sort_keys=True, separators=(",", ":"),
    ).encode("utf-8")
    signature = hmac.new(
        settings.notification_webhook_secret_key.get_secret_value().encode("utf-8"),
        body, hashlib.sha256,
    ).hexdigest()
    request = Request(
        settings.notification_webhook_url,
        data=body,
        headers={
            "Content-Type": "application/json",
            "X-ProofPrint-Event-ID": str(event_id),
            "X-ProofPrint-Signature": signature,
        },
        method="POST",
    )
    with urlopen(request, timeout=10) as response:
        if not 200 <= response.status < 300:
            raise RuntimeError("Notification webhook rejected the event")


def main() -> None:
    parser = argparse.ArgumentParser(description="Deliver ProofPrint outbox events")
    parser.add_argument("--once", action="store_true", help="Process at most one event")
    parser.add_argument("--poll-seconds", type=float, default=2.0)
    args = parser.parse_args()
    if not settings.notification_webhook_url:
        parser.error("NOTIFICATION_WEBHOOK_URL must be configured")
    dispatcher = OutboxDispatcher(SessionFactory, deliver_webhook)
    while True:
        processed = dispatcher.dispatch_one()
        if args.once:
            return
        if not processed:
            time.sleep(max(args.poll_seconds, 0.1))


if __name__ == "__main__":
    main()
