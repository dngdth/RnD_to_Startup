"""Submit one customer's block feedback as a single, atomic action."""

from __future__ import annotations

import hashlib
import json
from datetime import UTC, datetime
from uuid import UUID, uuid4

from proofprint.domain.entities.collaboration import ChangeRequest, ChangeRequestStatus, Comment
from proofprint.domain.entities.review_access import GuestPrincipal
from proofprint.domain.entities.version import ReviewRoundStatus
from proofprint.domain.exceptions import (
    Conflict,
    PreconditionFailed,
    ResourceNotFound,
    ValidationFailed,
)
from proofprint.domain.interfaces.collaboration import CollaborationRepository
from proofprint.domain.interfaces.draft import DraftRepository
from proofprint.domain.interfaces.review_access import UnitOfWork

OPERATION = "submit-customer-requests"


class SubmitCustomerRequests:
    def __init__(
        self,
        collaboration: CollaborationRepository,
        drafts: DraftRepository,
        unit_of_work: UnitOfWork,
    ) -> None:
        self.collaboration = collaboration
        self.drafts = drafts
        self.unit_of_work = unit_of_work

    def execute(
        self,
        *,
        guest: GuestPrincipal,
        workspace_id: UUID,
        version_id: UUID | None,
        items: list[tuple[UUID, str]],
        expected_revision: int,
        idempotency_key: str,
    ) -> dict[str, object]:
        if guest.workspace_id != workspace_id:
            raise ResourceNotFound("Workspace was not found")
        if not 1 <= len(items) <= 100:
            raise ValidationFailed("Submit between 1 and 100 block requests")
        normalized = [(block_id, message.strip()) for block_id, message in items]
        if len({block_id for block_id, _ in normalized}) != len(normalized):
            raise ValidationFailed("Only one request per block is allowed in a batch")
        if any(not message or len(message) > 5000 for _, message in normalized):
            raise ValidationFailed("Each request must contain 1 to 5000 characters")
        key = idempotency_key.strip()
        if not 1 <= len(key) <= 255:
            raise ValidationFailed("Idempotency-Key must contain 1 to 255 characters")
        fingerprint = hashlib.sha256(
            json.dumps(
                {"version_id": str(version_id) if version_id else None,
                 "items": sorted((str(block_id), message) for block_id, message in normalized)},
                sort_keys=True, ensure_ascii=False,
            ).encode("utf-8")
        ).hexdigest()

        workspace = self.collaboration.get_workspace_for_update(workspace_id)
        if workspace is None:
            raise ResourceNotFound("Workspace was not found")
        replay = self.collaboration.get_guest_idempotent_result(
            guest_session_id=guest.session_id, workspace_id=workspace_id,
            operation=OPERATION, idempotency_key=key,
        )
        if replay is not None:
            stored_fingerprint, payload = replay
            if stored_fingerprint != fingerprint:
                raise Conflict("Idempotency-Key was already used with another request")
            return payload
        if workspace.revision != expected_revision:
            raise PreconditionFailed("Workspace revision does not match If-Match")
        if workspace.record_status != "ACTIVE":
            raise Conflict("Workspace must be ACTIVE")

        review_round = None
        if workspace.workflow_status == "DRAFT":
            if version_id is not None:
                raise Conflict("Draft feedback must target the current draft")
            valid_block_ids = {block.id for block in self.drafts.list_blocks(workspace_id)}
        elif workspace.workflow_status == "IN_REVIEW":
            if version_id is None or version_id != workspace.latest_version_id:
                raise Conflict("Requests must target the Version currently in review")
            version = self.collaboration.get_version(workspace_id, version_id)
            if version is None:
                raise ResourceNotFound("Version was not found")
            valid_block_ids = {UUID(str(block["id"])) for block in version.snapshot}
            review_round = self.collaboration.get_review_round_for_version(workspace_id, version_id)
            if review_round is None or review_round.status != ReviewRoundStatus.OPEN:
                raise Conflict("Version does not have an open Review Round")
        else:
            raise Conflict("Requests can only be sent for the current draft or Version in review")
        if any(block_id not in valid_block_ids for block_id, _ in normalized):
            raise ValidationFailed("A selected block is not in the current draft or Version")

        now = datetime.now(UTC)
        batch_id = uuid4()
        next_revision = expected_revision + 1
        created: list[dict[str, str]] = []
        try:
            for block_id, message in normalized:
                if review_round is None:
                    item = Comment(
                        id=uuid4(), workspace_id=workspace_id, version_id=None,
                        block_id=block_id, change_request_id=None, body=message,
                        author_id=None, guest_session_id=guest.session_id,
                        author_username_snapshot=guest.username, created_at=now,
                        request_batch_id=batch_id,
                    )
                    self.collaboration.add_comment(item)
                    created.append({"block_id": str(block_id), "comment_id": str(item.id)})
                else:
                    item = ChangeRequest(
                        id=uuid4(), workspace_id=workspace_id,
                        review_round_id=review_round.id, version_id=version_id,
                        block_id=block_id, field_path=None, message=message,
                        status=ChangeRequestStatus.REQUESTED, requested_by=None,
                        requested_by_guest_session_id=guest.session_id,
                        requester_username_snapshot=guest.username,
                        acknowledged_by=None, resolved_in_version_id=None,
                        parent_change_request_id=None, resolution_note=None,
                        created_at=now, updated_at=now,
                    )
                    self.collaboration.add_change_request(item)
                    created.append({"block_id": str(block_id), "change_request_id": str(item.id)})
            if review_round is not None:
                self.collaboration.close_review_round_for_changes(
                    review_round.id, closed_at=now,
                    decision_note=f"Khách hàng gửi {len(created)} yêu cầu theo hạng mục",
                )
            self.collaboration.bump_workspace_revision(
                workspace_id, revision=next_revision, updated_at=now,
                workflow_status="DRAFT" if review_round is not None else None,
            )
            self.collaboration.add_audit_event(
                workspace_id=workspace_id,
                event_type="CUSTOMER_REQUEST_BATCH_SUBMITTED",
                entity_type="CustomerRequestBatch", entity_id=batch_id,
                guest_session_id=guest.session_id,
                actor_username_snapshot=guest.username, version_id=version_id,
                metadata={"count": len(created), "block_ids": [str(block_id) for block_id, _ in normalized],
                          "workspace_revision": next_revision},
            )
            self.collaboration.add_outbox_message(
                "CUSTOMER_REQUEST_BATCH_SUBMITTED",
                {"workspace_id": str(workspace_id), "version_id": str(version_id) if version_id else None,
                 "batch_id": str(batch_id), "count": len(created)},
            )
            payload: dict[str, object] = {
                "batch_id": str(batch_id), "workspace_revision": next_revision,
                "items": created,
            }
            self.collaboration.add_guest_idempotent_result(
                guest_session_id=guest.session_id, workspace_id=workspace_id,
                operation=OPERATION, idempotency_key=key,
                request_fingerprint=fingerprint, response_payload=payload,
            )
            self.unit_of_work.commit()
        except Exception:
            self.unit_of_work.rollback()
            raise
        return payload
