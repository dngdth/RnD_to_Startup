import unittest
from dataclasses import replace
from datetime import UTC, datetime
from typing import Any
from uuid import UUID, uuid4

from fastapi.testclient import TestClient

from proofprint.application.use_cases import (
    AcknowledgeChangeRequest,
    CancelChangeRequest,
    ConfirmChangeRequest,
    CreateChangeRequest,
    CreateComment,
    ListComments,
    MarkChangeRequestUpdated,
    RejectChangeRequest,
    ReopenChangeRequest,
    RequestChanges,
)
from proofprint.domain.entities.collaboration import (
    ChangeRequest,
    ChangeRequestStatus,
    Comment,
)
from proofprint.domain.entities.identity import CurrentActor, SystemRole
from proofprint.domain.entities.review_access import GuestPrincipal
from proofprint.domain.entities.version import (
    ReviewRound,
    ReviewRoundStatus,
    SpecificationVersion,
)
from proofprint.domain.entities.workspace import WorkspaceGrant, WorkspaceSummary
from proofprint.domain.exceptions import Conflict, PermissionDenied, ValidationFailed
from proofprint.main import create_app
from proofprint.presentation.api.dependencies import (
    get_create_change_request,
    get_current_guest,
)


class FakeUnitOfWork:
    def __init__(self) -> None:
        self.commits = 0
        self.rollbacks = 0

    def commit(self) -> None:
        self.commits += 1

    def rollback(self) -> None:
        self.rollbacks += 1


class InMemoryCollaborationRepository:
    def __init__(
        self,
        workspace: WorkspaceSummary,
        designer: CurrentActor,
        version: SpecificationVersion,
        review_round: ReviewRound,
    ) -> None:
        self.workspace = workspace
        self.grants = {
            (workspace.id, designer.id): WorkspaceGrant(
                workspace_id=workspace.id,
                role=SystemRole.DESIGNER,
                can_view=True,
                can_edit=True,
                can_review=True,
                can_approve=False,
                can_lock_production=True,
            )
        }
        self.versions = {version.id: version}
        self.review_rounds = {review_round.id: review_round}
        self.comments: dict[UUID, Comment] = {}
        self.change_requests: dict[UUID, ChangeRequest] = {}
        self.guest_views: set[tuple[UUID, UUID]] = set()
        self.audit_events: list[dict[str, Any]] = []
        self.outbox: list[tuple[str, dict[str, Any]]] = []
        self.idempotency: dict[
            tuple[UUID, UUID, str, str], tuple[str, dict[str, Any]]
        ] = {}

    def get_workspace(self, workspace_id: UUID) -> WorkspaceSummary | None:
        return self.workspace if workspace_id == self.workspace.id else None

    def get_workspace_for_update(self, workspace_id: UUID) -> WorkspaceSummary | None:
        return self.get_workspace(workspace_id)

    def get_active_grant(self, workspace_id: UUID, user_id: UUID) -> WorkspaceGrant | None:
        return self.grants.get((workspace_id, user_id))

    def get_version(
        self, workspace_id: UUID, version_id: UUID
    ) -> SpecificationVersion | None:
        version = self.versions.get(version_id)
        return version if version is not None and version.workspace_id == workspace_id else None

    def get_review_round_for_version(
        self, workspace_id: UUID, version_id: UUID
    ) -> ReviewRound | None:
        return next(
            (
                item
                for item in self.review_rounds.values()
                if item.workspace_id == workspace_id and item.version_id == version_id
            ),
            None,
        )

    def get_open_review_round(self, workspace_id: UUID) -> ReviewRound | None:
        return next(
            (
                item
                for item in self.review_rounds.values()
                if item.workspace_id == workspace_id and item.status == ReviewRoundStatus.OPEN
            ),
            None,
        )

    def add_comment(self, comment: Comment) -> None:
        self.comments[comment.id] = comment

    def list_comments(
        self,
        workspace_id: UUID,
        *,
        version_id: UUID | None = None,
        block_id: UUID | None = None,
        change_request_id: UUID | None = None,
    ) -> list[Comment]:
        return [
            item
            for item in self.comments.values()
            if item.workspace_id == workspace_id
            and (version_id is None or item.version_id == version_id)
            and (block_id is None or item.block_id == block_id)
            and (
                change_request_id is None
                or item.change_request_id == change_request_id
            )
        ]

    def add_change_request(self, change_request: ChangeRequest) -> None:
        self.change_requests[change_request.id] = change_request

    def list_change_requests(self, workspace_id: UUID) -> list[ChangeRequest]:
        return [
            item
            for item in self.change_requests.values()
            if item.workspace_id == workspace_id
        ]

    def get_change_request(self, change_request_id: UUID) -> ChangeRequest | None:
        return self.change_requests.get(change_request_id)

    def get_change_request_for_update(
        self, change_request_id: UUID
    ) -> ChangeRequest | None:
        return self.get_change_request(change_request_id)

    def update_change_request(
        self,
        change_request_id: UUID,
        *,
        status: ChangeRequestStatus,
        updated_at: datetime,
        acknowledged_by: UUID | None = None,
        resolved_in_version_id: UUID | None = None,
        resolution_note: str | None = None,
    ) -> None:
        current = self.change_requests[change_request_id]
        self.change_requests[change_request_id] = replace(
            current,
            status=status,
            updated_at=updated_at,
            acknowledged_by=acknowledged_by or current.acknowledged_by,
            resolved_in_version_id=(
                resolved_in_version_id or current.resolved_in_version_id
            ),
            resolution_note=resolution_note or current.resolution_note,
        )

    def count_change_requests(
        self, review_round_id: UUID, *, status: ChangeRequestStatus
    ) -> int:
        return sum(
            item.review_round_id == review_round_id and item.status == status
            for item in self.change_requests.values()
        )

    def has_guest_viewed_version(self, guest_session_id: UUID, version_id: UUID) -> bool:
        return (guest_session_id, version_id) in self.guest_views

    def bump_workspace_revision(
        self,
        workspace_id: UUID,
        *,
        revision: int,
        updated_at: datetime,
        workflow_status: str | None = None,
    ) -> None:
        if workspace_id == self.workspace.id:
            self.workspace = replace(
                self.workspace,
                revision=revision,
                updated_at=updated_at,
                workflow_status=workflow_status or self.workspace.workflow_status,
            )

    def close_review_round_for_changes(
        self,
        review_round_id: UUID,
        *,
        closed_at: datetime,
        decision_note: str | None,
    ) -> None:
        current = self.review_rounds[review_round_id]
        self.review_rounds[review_round_id] = replace(
            current,
            status=ReviewRoundStatus.CHANGES_REQUESTED,
            closed_at=closed_at,
            decision_note=decision_note,
        )

    def add_audit_event(self, **event: Any) -> None:
        self.audit_events.append(event)

    def add_outbox_message(self, event_type: str, payload: dict[str, Any]) -> None:
        self.outbox.append((event_type, payload))

    def get_guest_idempotent_result(
        self,
        *,
        guest_session_id: UUID,
        workspace_id: UUID,
        operation: str,
        idempotency_key: str,
    ) -> tuple[str, dict[str, Any]] | None:
        return self.idempotency.get(
            (guest_session_id, workspace_id, operation, idempotency_key)
        )

    def add_guest_idempotent_result(
        self,
        *,
        guest_session_id: UUID,
        workspace_id: UUID,
        operation: str,
        idempotency_key: str,
        request_fingerprint: str,
        response_payload: dict[str, Any],
    ) -> None:
        self.idempotency[(guest_session_id, workspace_id, operation, idempotency_key)] = (
            request_fingerprint,
            response_payload,
        )


class CollaborationPhaseThreeTests(unittest.TestCase):
    def setUp(self) -> None:
        self.designer = CurrentActor(
            id=uuid4(),
            email="designer@example.com",
            display_name="Designer",
            system_role=SystemRole.DESIGNER,
        )
        self.guest = GuestPrincipal(
            session_id=uuid4(),
            review_link_id=uuid4(),
            workspace_id=uuid4(),
            username="Customer A",
            link_version=1,
        )
        self.block_id = uuid4()
        now = datetime.now(UTC)
        self.version = SpecificationVersion(
            id=uuid4(),
            workspace_id=self.guest.workspace_id,
            number=1,
            previous_version_id=None,
            snapshot=[
                {
                    "id": str(self.block_id),
                    "block_type": "dimension",
                    "label": "Size",
                    "content": {"width": 30, "height": 20, "unit": "cm"},
                    "position": 0,
                    "schema_version": 1,
                }
            ],
            content_hash="a" * 64,
            schema_version=1,
            created_by=self.designer.id,
            created_at=now,
        )
        self.review_round = ReviewRound(
            id=uuid4(),
            workspace_id=self.guest.workspace_id,
            version_id=self.version.id,
            status=ReviewRoundStatus.OPEN,
            opened_at=now,
        )
        self.workspace = WorkspaceSummary(
            id=self.guest.workspace_id,
            customer_id=uuid4(),
            customer_name="Customer",
            customer_email=None,
            customer_phone=None,
            product_type="apparel",
            workflow_status="IN_REVIEW",
            record_status="ACTIVE",
            latest_version_id=self.version.id,
            approved_version_id=None,
            production_version_id=None,
            revision=0,
            updated_at=now,
        )
        self.repository = InMemoryCollaborationRepository(
            self.workspace, self.designer, self.version, self.review_round
        )
        self.uow = FakeUnitOfWork()

    def create_request(self, key: str = "create-cr-1") -> tuple[ChangeRequest, int]:
        return CreateChangeRequest(self.repository, self.uow).execute(
            guest=self.guest,
            workspace_id=self.workspace.id,
            version_id=self.version.id,
            block_id=self.block_id,
            field_path="content.width",
            message="Please reduce the width",
            expected_revision=self.repository.workspace.revision,
            idempotency_key=key,
        )

    def test_create_request_and_request_changes_are_idempotent(self) -> None:
        created, revision = self.create_request()
        replayed, replayed_revision = CreateChangeRequest(
            self.repository, self.uow
        ).execute(
            guest=self.guest,
            workspace_id=self.workspace.id,
            version_id=self.version.id,
            block_id=self.block_id,
            field_path="content.width",
            message="Please reduce the width",
            expected_revision=0,
            idempotency_key="create-cr-1",
        )

        self.assertEqual(created.id, replayed.id)
        self.assertEqual((revision, replayed_revision), (1, 1))
        self.assertEqual(len(self.repository.change_requests), 1)

        closed, closed_revision = RequestChanges(self.repository, self.uow).execute(
            guest=self.guest,
            workspace_id=self.workspace.id,
            version_id=self.version.id,
            decision_note="Please update the requested size",
            expected_revision=1,
            idempotency_key="request-changes-1",
        )
        replayed_closed, replayed_closed_revision = RequestChanges(
            self.repository, self.uow
        ).execute(
            guest=self.guest,
            workspace_id=self.workspace.id,
            version_id=self.version.id,
            decision_note="Please update the requested size",
            expected_revision=1,
            idempotency_key="request-changes-1",
        )

        self.assertEqual(closed.status, ReviewRoundStatus.CHANGES_REQUESTED)
        self.assertEqual(closed.id, replayed_closed.id)
        self.assertEqual((closed_revision, replayed_closed_revision), (2, 2))
        self.assertEqual(self.repository.workspace.workflow_status, "DRAFT")
        self.assertEqual(self.uow.commits, 2)

    def test_idempotency_key_reuse_with_different_payload_is_rejected(self) -> None:
        self.create_request("same-key")
        with self.assertRaises(Conflict):
            CreateChangeRequest(self.repository, self.uow).execute(
                guest=self.guest,
                workspace_id=self.workspace.id,
                version_id=self.version.id,
                block_id=self.block_id,
                field_path="content.height",
                message="Different request",
                expected_revision=1,
                idempotency_key="same-key",
            )

    def test_designer_update_requires_new_released_version_and_guest_view(self) -> None:
        change_request, _ = self.create_request()
        RequestChanges(self.repository, self.uow).execute(
            guest=self.guest,
            workspace_id=self.workspace.id,
            version_id=self.version.id,
            decision_note=None,
            expected_revision=1,
            idempotency_key="decision-1",
        )
        acknowledged, revision = AcknowledgeChangeRequest(
            self.repository, self.uow
        ).execute(
            actor=self.designer,
            change_request_id=change_request.id,
            expected_revision=2,
        )
        self.assertEqual(acknowledged.status, ChangeRequestStatus.ACKNOWLEDGED)

        version_two, round_two = self.install_second_review(revision + 1)
        updated, revision = MarkChangeRequestUpdated(self.repository, self.uow).execute(
            actor=self.designer,
            change_request_id=change_request.id,
            resolved_in_version_id=version_two.id,
            expected_revision=4,
        )
        self.assertEqual(updated.status, ChangeRequestStatus.UPDATED)

        with self.assertRaises(Conflict):
            ConfirmChangeRequest(self.repository, self.uow).execute(
                guest=self.guest,
                change_request_id=change_request.id,
                expected_revision=revision,
            )

        self.repository.guest_views.add((self.guest.session_id, version_two.id))
        confirmed, confirmed_revision = ConfirmChangeRequest(
            self.repository, self.uow
        ).execute(
            guest=self.guest,
            change_request_id=change_request.id,
            expected_revision=revision,
        )
        self.assertEqual(confirmed.status, ChangeRequestStatus.CONFIRMED)
        self.assertEqual(confirmed_revision, 6)
        self.assertEqual(round_two.status, ReviewRoundStatus.OPEN)

    def test_reopen_creates_child_request_in_current_review_round(self) -> None:
        change_request = self.install_updated_request()
        resolved_id = change_request.resolved_in_version_id
        assert resolved_id is not None
        self.repository.guest_views.add((self.guest.session_id, resolved_id))

        reopened, child, revision = ReopenChangeRequest(
            self.repository, self.uow
        ).execute(
            guest=self.guest,
            change_request_id=change_request.id,
            message="Width is still incorrect",
            expected_revision=self.repository.workspace.revision,
        )

        self.assertEqual(reopened.status, ChangeRequestStatus.REOPENED)
        self.assertEqual(child.status, ChangeRequestStatus.REQUESTED)
        self.assertEqual(child.parent_change_request_id, reopened.id)
        self.assertEqual(child.version_id, resolved_id)
        self.assertEqual(revision, self.repository.workspace.revision)

    def test_only_creator_guest_can_cancel_request(self) -> None:
        change_request, _ = self.create_request()
        other_guest = replace(self.guest, session_id=uuid4())
        with self.assertRaises(PermissionDenied):
            CancelChangeRequest(self.repository, self.uow).execute(
                guest=other_guest,
                change_request_id=change_request.id,
                expected_revision=1,
            )

        cancelled, revision = CancelChangeRequest(self.repository, self.uow).execute(
            guest=self.guest,
            change_request_id=change_request.id,
            expected_revision=1,
        )
        self.assertEqual(cancelled.status, ChangeRequestStatus.CANCELLED)
        self.assertEqual(revision, 2)

    def test_designer_can_reject_after_request_changes_with_note(self) -> None:
        change_request, _ = self.create_request()
        RequestChanges(self.repository, self.uow).execute(
            guest=self.guest,
            workspace_id=self.workspace.id,
            version_id=self.version.id,
            decision_note=None,
            expected_revision=1,
            idempotency_key="decision-reject",
        )
        rejected, revision = RejectChangeRequest(self.repository, self.uow).execute(
            actor=self.designer,
            change_request_id=change_request.id,
            resolution_note="The requested size is technically impossible",
            expected_revision=2,
        )
        self.assertEqual(rejected.status, ChangeRequestStatus.REJECTED)
        self.assertEqual(rejected.resolution_note, "The requested size is technically impossible")
        self.assertEqual(revision, 3)

    def test_comments_preserve_guest_identity_and_validate_snapshot_block(self) -> None:
        comment, revision = CreateComment(self.repository, self.uow).execute(
            author=self.guest,
            workspace_id=self.workspace.id,
            body="Please check this dimension",
            version_id=self.version.id,
            block_id=self.block_id,
            change_request_id=None,
            expected_revision=0,
        )
        listed = ListComments(self.repository).execute(
            self.designer, self.workspace.id, block_id=self.block_id
        )

        self.assertEqual(comment.author_username_snapshot, self.guest.username)
        self.assertEqual(comment.guest_session_id, self.guest.session_id)
        self.assertEqual(listed, [comment])
        self.assertEqual(revision, 1)

        with self.assertRaises(ValidationFailed):
            CreateComment(self.repository, self.uow).execute(
                author=self.guest,
                workspace_id=self.workspace.id,
                body="Unknown block",
                version_id=self.version.id,
                block_id=uuid4(),
                change_request_id=None,
                expected_revision=1,
            )

    def test_http_customer_creates_change_request_without_account_actor_fields(self) -> None:
        app = create_app()
        app.dependency_overrides[get_current_guest] = lambda: self.guest
        app.dependency_overrides[get_create_change_request] = lambda: CreateChangeRequest(
            self.repository, self.uow
        )

        with TestClient(app) as client:
            response = client.post(
                f"/api/v1/workspaces/{self.workspace.id}/versions/"
                f"{self.version.id}/change-requests",
                headers={"If-Match": 'W/"0"', "Idempotency-Key": "http-cr-1"},
                json={
                    "block_id": str(self.block_id),
                    "field_path": "content.width",
                    "message": "Please reduce the width",
                },
            )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.headers["etag"], 'W/"1"')
        body = response.json()["change_request"]
        self.assertIsNone(body["requested_by"])
        self.assertEqual(body["requester_username"], self.guest.username)

    def install_second_review(
        self, revision: int
    ) -> tuple[SpecificationVersion, ReviewRound]:
        version = replace(
            self.version,
            id=uuid4(),
            number=2,
            previous_version_id=self.version.id,
            snapshot=[
                {
                    **self.version.snapshot[0],
                    "content": {"width": 25, "height": 20, "unit": "cm"},
                }
            ],
            content_hash="b" * 64,
        )
        review_round = ReviewRound(
            id=uuid4(),
            workspace_id=self.workspace.id,
            version_id=version.id,
            status=ReviewRoundStatus.OPEN,
            opened_at=datetime.now(UTC),
        )
        self.repository.versions[version.id] = version
        self.repository.review_rounds[review_round.id] = review_round
        self.repository.workspace = replace(
            self.repository.workspace,
            workflow_status="IN_REVIEW",
            latest_version_id=version.id,
            revision=revision,
        )
        return version, review_round

    def install_updated_request(self) -> ChangeRequest:
        now = datetime.now(UTC)
        version_two, review_round = self.install_second_review(7)
        change_request = ChangeRequest(
            id=uuid4(),
            workspace_id=self.workspace.id,
            review_round_id=self.review_round.id,
            version_id=self.version.id,
            block_id=self.block_id,
            field_path="content.width",
            message="Please reduce the width",
            status=ChangeRequestStatus.UPDATED,
            requested_by=None,
            requested_by_guest_session_id=self.guest.session_id,
            requester_username_snapshot=self.guest.username,
            acknowledged_by=self.designer.id,
            resolved_in_version_id=version_two.id,
            parent_change_request_id=None,
            resolution_note=None,
            created_at=now,
            updated_at=now,
        )
        self.repository.change_requests[change_request.id] = change_request
        self.repository.review_rounds[self.review_round.id] = replace(
            self.review_round,
            status=ReviewRoundStatus.CHANGES_REQUESTED,
            closed_at=now,
        )
        self.repository.review_rounds[review_round.id] = review_round
        return change_request


if __name__ == "__main__":
    unittest.main()
