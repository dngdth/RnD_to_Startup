import unittest
from dataclasses import replace
from datetime import UTC, datetime
from typing import Any
from uuid import UUID, uuid4

from fastapi import FastAPI
from fastapi.testclient import TestClient

from proofprint.application.use_cases.manage_approvals import (
    ApproveVersion,
    GetProductionSnapshot,
    LockProduction,
)
from proofprint.domain.entities.approval_production import Approval
from proofprint.domain.entities.collaboration import ChangeRequest, ChangeRequestStatus
from proofprint.domain.entities.identity import CurrentActor, SystemRole
from proofprint.domain.entities.review_access import GuestPrincipal
from proofprint.domain.entities.version import (
    ReviewRound,
    ReviewRoundStatus,
    SpecificationVersion,
)
from proofprint.domain.entities.workspace import WorkspaceGrant, WorkspaceSummary
from proofprint.domain.exceptions import (
    Conflict,
    PermissionDenied,
    PreconditionFailed,
    ResourceNotFound,
)
from proofprint.presentation.api.dependencies import get_approve_version, get_current_guest
from proofprint.presentation.api.routers.approval_production import router


class FakeUnitOfWork:
    def __init__(self) -> None:
        self.commits = 0
        self.rollbacks = 0

    def commit(self) -> None:
        self.commits += 1

    def rollback(self) -> None:
        self.rollbacks += 1


class FakeApprovals:
    def __init__(self) -> None:
        now = datetime.now(UTC)
        self.designer = CurrentActor(uuid4(), "designer@example.com", "D", SystemRole.DESIGNER)
        self.guest = GuestPrincipal(uuid4(), uuid4(), uuid4(), "Alice", 3)
        self.workspace = WorkspaceSummary(
            id=self.guest.workspace_id,
            customer_id=uuid4(),
            customer_name="Customer",
            customer_email=None,
            customer_phone=None,
            product_type="shirt",
            workflow_status="IN_REVIEW",
            record_status="ACTIVE",
            latest_version_id=None,
            approved_version_id=None,
            production_version_id=None,
            revision=4,
            updated_at=now,
        )
        self.version = SpecificationVersion(
            id=uuid4(),
            workspace_id=self.workspace.id,
            number=2,
            previous_version_id=None,
            snapshot=[{"id": str(uuid4()), "type": "TEXT", "position": 0, "content": {}}],
            content_hash="hash",
            schema_version=1,
            created_by=self.designer.id,
            created_at=now,
        )
        self.workspace = replace(self.workspace, latest_version_id=self.version.id)
        self.round = ReviewRound(
            uuid4(), self.workspace.id, self.version.id, ReviewRoundStatus.OPEN, now
        )
        self.grant = WorkspaceGrant(
            self.workspace.id, SystemRole.DESIGNER, True, True, True, False, True
        )
        self.requests: dict[UUID, ChangeRequest] = {}
        self.approval: Approval | None = None
        self.idempotency: dict[tuple[UUID | None, UUID | None, str, str], tuple[str, dict[str, Any]]] = {}
        self.events: list[dict[str, Any]] = []
        self.outbox: list[tuple[str, dict[str, Any]]] = []

    def get_workspace(self, workspace_id: UUID) -> WorkspaceSummary | None:
        return self.workspace if workspace_id == self.workspace.id else None

    def get_workspace_for_update(self, workspace_id: UUID) -> WorkspaceSummary | None:
        return self.get_workspace(workspace_id)

    def get_active_grant(self, workspace_id: UUID, user_id: UUID) -> WorkspaceGrant | None:
        if workspace_id == self.workspace.id and user_id == self.designer.id:
            return self.grant
        return None

    def get_version(self, workspace_id: UUID, version_id: UUID) -> SpecificationVersion | None:
        if workspace_id == self.workspace.id and version_id == self.version.id:
            return self.version
        return None

    def get_review_round_for_version(self, workspace_id: UUID, version_id: UUID) -> ReviewRound | None:
        if workspace_id == self.workspace.id and version_id == self.version.id:
            return self.round
        return None

    def list_change_requests_for_update(self, workspace_id: UUID) -> list[ChangeRequest]:
        return [item for item in self.requests.values() if item.workspace_id == workspace_id]

    def update_change_request_status(
        self, change_request_id: UUID, status: ChangeRequestStatus, updated_at: datetime
    ) -> None:
        self.requests[change_request_id] = replace(
            self.requests[change_request_id], status=status, updated_at=updated_at
        )

    def get_approval_for_version(self, workspace_id: UUID, version_id: UUID) -> Approval | None:
        if self.approval and self.approval.workspace_id == workspace_id and self.approval.version_id == version_id:
            return self.approval
        return None

    def add_approval(self, approval: Approval) -> None:
        self.approval = approval

    def close_review_round_approved(self, review_round_id: UUID, closed_at: datetime) -> None:
        assert review_round_id == self.round.id
        self.round = replace(self.round, status=ReviewRoundStatus.APPROVED, closed_at=closed_at)

    def mark_workspace_approved(
        self, workspace_id: UUID, version_id: UUID, revision: int, updated_at: datetime
    ) -> None:
        assert workspace_id == self.workspace.id
        self.workspace = replace(
            self.workspace,
            workflow_status="APPROVED",
            approved_version_id=version_id,
            revision=revision,
            updated_at=updated_at,
        )

    def mark_workspace_production_locked(
        self, workspace_id: UUID, version_id: UUID, revision: int, updated_at: datetime
    ) -> None:
        assert workspace_id == self.workspace.id
        self.workspace = replace(
            self.workspace,
            workflow_status="LOCKED_FOR_PRODUCTION",
            production_version_id=version_id,
            revision=revision,
            updated_at=updated_at,
        )

    def get_idempotent_result(
        self,
        *,
        actor_id: UUID | None,
        guest_session_id: UUID | None,
        workspace_id: UUID,
        operation: str,
        idempotency_key: str,
    ) -> tuple[str, dict[str, Any]] | None:
        return self.idempotency.get((actor_id, guest_session_id, operation, idempotency_key))

    def add_idempotent_result(
        self,
        *,
        actor_id: UUID | None,
        guest_session_id: UUID | None,
        workspace_id: UUID,
        operation: str,
        idempotency_key: str,
        request_fingerprint: str,
        response_payload: dict[str, Any],
    ) -> None:
        self.idempotency[(actor_id, guest_session_id, operation, idempotency_key)] = (
            request_fingerprint,
            response_payload,
        )

    def add_audit_event(self, **event: Any) -> None:
        self.events.append(event)

    def add_outbox_message(self, event_type: str, payload: dict[str, Any]) -> None:
        self.outbox.append((event_type, payload))

    def make_request(
        self,
        status: ChangeRequestStatus,
        resolved_in_version_id: UUID | None = None,
    ) -> ChangeRequest:
        now = datetime.now(UTC)
        request = ChangeRequest(
            id=uuid4(),
            workspace_id=self.workspace.id,
            review_round_id=self.round.id,
            version_id=self.version.id,
            block_id=uuid4(),
            field_path=None,
            message="Fix this",
            status=status,
            requested_by=None,
            requested_by_guest_session_id=self.guest.session_id,
            requester_username_snapshot=self.guest.username,
            acknowledged_by=None,
            resolved_in_version_id=resolved_in_version_id,
            parent_change_request_id=None,
            resolution_note=None,
            created_at=now,
            updated_at=now,
        )
        self.requests[request.id] = request
        return request


class ApprovalProductionTests(unittest.TestCase):
    def setUp(self) -> None:
        self.repo = FakeApprovals()
        self.uow = FakeUnitOfWork()
        self.approve = ApproveVersion(self.repo, self.uow)
        self.lock = LockProduction(self.repo, self.uow)

    def approve_current(self, key: str = "approve-1") -> tuple[Approval, int]:
        return self.approve.execute(
            guest=self.repo.guest,
            workspace_id=self.repo.workspace.id,
            version_id=self.repo.version.id,
            expected_revision=4,
            idempotency_key=key,
        )

    def test_approve_then_lock_exact_version_and_read_snapshot(self) -> None:
        updated = self.repo.make_request(ChangeRequestStatus.UPDATED, self.repo.version.id)
        approval, revision = self.approve_current()
        self.assertEqual(revision, 5)
        self.assertEqual(approval.guest_session_id, self.repo.guest.session_id)
        self.assertEqual(approval.reviewer_username_snapshot, "Alice")
        self.assertEqual(self.repo.requests[updated.id].status, ChangeRequestStatus.CONFIRMED)
        self.assertEqual(self.repo.round.status, ReviewRoundStatus.APPROVED)
        self.assertEqual(self.repo.workspace.workflow_status, "APPROVED")
        snapshot, locked_revision = self.lock.execute(
            actor=self.repo.designer,
            workspace_id=self.repo.workspace.id,
            version_id=self.repo.version.id,
            expected_revision=5,
            idempotency_key="lock-1",
        )
        self.assertEqual(locked_revision, 6)
        self.assertEqual(snapshot.approval.id, approval.id)
        self.assertEqual(self.repo.workspace.production_version_id, self.repo.version.id)
        self.assertEqual(self.repo.workspace.workflow_status, "LOCKED_FOR_PRODUCTION")
        self.assertEqual(
            GetProductionSnapshot(self.repo).execute(self.repo.guest, self.repo.workspace.id),
            snapshot,
        )
        self.assertEqual([e["event_type"] for e in self.repo.events], ["VERSION_APPROVED", "PRODUCTION_LOCKED"])
        self.assertEqual([e[0] for e in self.repo.outbox], ["VERSION_APPROVED", "PRODUCTION_LOCKED"])

    def test_requested_or_acknowledged_blocks_approval(self) -> None:
        for status in (ChangeRequestStatus.REQUESTED, ChangeRequestStatus.ACKNOWLEDGED):
            with self.subTest(status=status):
                request = self.repo.make_request(status)
                with self.assertRaises(Conflict):
                    self.approve_current()
                del self.repo.requests[request.id]
        self.assertIsNone(self.repo.approval)

    def test_updated_wrong_version_blocks_approval_but_reopened_parent_does_not(self) -> None:
        request = self.repo.make_request(ChangeRequestStatus.UPDATED, uuid4())
        with self.assertRaises(Conflict):
            self.approve_current()
        self.repo.requests[request.id] = replace(request, status=ChangeRequestStatus.REOPENED)
        self.approve_current()

    def test_retry_does_not_duplicate_approval_or_lock(self) -> None:
        approval, _ = self.approve_current()
        repeated, revision = self.approve_current()
        self.assertEqual(repeated.id, approval.id)
        self.assertEqual(revision, 5)
        repeated_other_key, _ = self.approve_current("other-key")
        self.assertEqual(repeated_other_key.id, approval.id)
        self.lock.execute(
            actor=self.repo.designer,
            workspace_id=self.repo.workspace.id,
            version_id=self.repo.version.id,
            expected_revision=5,
            idempotency_key="lock-1",
        )
        snapshot, revision = self.lock.execute(
            actor=self.repo.designer,
            workspace_id=self.repo.workspace.id,
            version_id=self.repo.version.id,
            expected_revision=5,
            idempotency_key="lock-1",
        )
        self.assertEqual(snapshot.version.id, self.repo.version.id)
        self.assertEqual(revision, 6)
        new_key_snapshot, new_key_revision = self.lock.execute(
            actor=self.repo.designer,
            workspace_id=self.repo.workspace.id,
            version_id=self.repo.version.id,
            expected_revision=5,
            idempotency_key="lock-other-key",
        )
        self.assertEqual(new_key_snapshot.version.id, self.repo.version.id)
        self.assertEqual(new_key_revision, 6)
        self.assertEqual(len(self.repo.events), 2)

        self.repo.workspace = replace(self.repo.workspace, record_status="ARCHIVED")
        with self.assertRaises(Conflict):
            self.lock.execute(
                actor=self.repo.designer,
                workspace_id=self.repo.workspace.id,
                version_id=self.repo.version.id,
                expected_revision=6,
                idempotency_key="lock-while-archived",
            )

    def test_revision_and_permission_guards(self) -> None:
        with self.assertRaises(PreconditionFailed):
            self.approve.execute(
                guest=self.repo.guest,
                workspace_id=self.repo.workspace.id,
                version_id=self.repo.version.id,
                expected_revision=3,
                idempotency_key="bad",
            )
        outsider = replace(self.repo.guest, workspace_id=uuid4())
        with self.assertRaises(ResourceNotFound):
            self.approve.execute(
                guest=outsider,
                workspace_id=self.repo.workspace.id,
                version_id=self.repo.version.id,
                expected_revision=4,
                idempotency_key="other",
            )
        self.approve_current()
        self.repo.grant = replace(self.repo.grant, can_lock_production=False)
        with self.assertRaises(PermissionDenied):
            self.lock.execute(
                actor=self.repo.designer,
                workspace_id=self.repo.workspace.id,
                version_id=self.repo.version.id,
                expected_revision=5,
                idempotency_key="no-lock",
            )
        with self.assertRaises(ResourceNotFound):
            GetProductionSnapshot(self.repo).execute(
                CurrentActor(uuid4(), "admin@example.com", "Admin", SystemRole.ADMIN),
                self.repo.workspace.id,
            )

    def test_wrong_version_cannot_be_production_locked(self) -> None:
        self.approve_current()
        with self.assertRaises(Conflict) as caught:
            self.lock.execute(
                actor=self.repo.designer,
                workspace_id=self.repo.workspace.id,
                version_id=uuid4(),
                expected_revision=5,
                idempotency_key="wrong",
            )
        self.assertIn("APPROVAL_VERSION_MISMATCH", str(caught.exception))

    def test_snapshot_is_not_available_before_lock(self) -> None:
        with self.assertRaises(ResourceNotFound):
            GetProductionSnapshot(self.repo).execute(self.repo.guest, self.repo.workspace.id)

    def test_http_approval_requires_guest_and_headers(self) -> None:
        app = FastAPI()
        app.include_router(router, prefix="/api/v1")
        app.dependency_overrides[get_current_guest] = lambda: self.repo.guest
        app.dependency_overrides[get_approve_version] = lambda: self.approve
        with TestClient(app) as client:
            response = client.post(
                f"/api/v1/workspaces/{self.repo.workspace.id}/versions/{self.repo.version.id}/approvals",
                headers={"If-Match": 'W/"4"', "Idempotency-Key": "approval-http"},
            )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.headers["etag"], 'W/"5"')
        self.assertEqual(response.json()["approval"]["reviewer_username_snapshot"], "Alice")


if __name__ == "__main__":
    unittest.main()
