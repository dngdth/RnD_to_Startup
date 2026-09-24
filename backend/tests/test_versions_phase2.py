import unittest
from dataclasses import replace
from datetime import UTC, datetime
from types import SimpleNamespace
from typing import Any
from uuid import UUID, uuid4

from fastapi.testclient import TestClient

from proofprint.application.use_cases import (
    GetReviewRound,
    GetVersion,
    GetVersionDiff,
    ListVersions,
    ReleaseVersion,
)
from proofprint.domain.entities.draft import Asset, AssetStatus, BlockType, SpecificationBlock
from proofprint.domain.entities.identity import CurrentActor, SystemRole
from proofprint.domain.entities.review_access import GuestPrincipal
from proofprint.domain.entities.version import (
    ReviewRound,
    ReviewRoundStatus,
    SpecificationVersion,
    VersionDisplayStatus,
)
from proofprint.domain.entities.workspace import WorkspaceGrant, WorkspaceSummary
from proofprint.domain.exceptions import (
    Conflict,
    PermissionDenied,
    PreconditionFailed,
    ResourceNotFound,
    ValidationFailed,
)
from proofprint.infrastructure.database import settings
from proofprint.main import create_app
from proofprint.presentation.api.dependencies import (
    get_current_actor,
    get_list_versions,
    get_release_version,
    get_resolve_current_actor,
    get_resolve_guest_session,
)


class FakeUnitOfWork:
    def __init__(self) -> None:
        self.commits = 0
        self.rollbacks = 0

    def commit(self) -> None:
        self.commits += 1

    def rollback(self) -> None:
        self.rollbacks += 1


class InMemoryVersionRepository:
    def __init__(self, workspace: WorkspaceSummary, actor: CurrentActor) -> None:
        self.workspace = workspace
        self.grants = {
            (workspace.id, actor.id): WorkspaceGrant(
                workspace_id=workspace.id,
                role=SystemRole.DESIGNER,
                can_view=True,
                can_edit=True,
                can_review=False,
                can_approve=False,
                can_lock_production=True,
            )
        }
        self.blocks: list[SpecificationBlock] = []
        self.assets: dict[UUID, Asset] = {}
        self.versions: dict[UUID, SpecificationVersion] = {}
        self.review_rounds: dict[UUID, ReviewRound] = {}
        self.audit_events: list[dict[str, Any]] = []
        self.outbox_messages: list[tuple[str, dict[str, Any]]] = []
        self.idempotent_results: dict[
            tuple[UUID, UUID, str, str], tuple[str, dict[str, Any]]
        ] = {}
        self.guest_version_views: set[tuple[UUID, UUID]] = set()
        self.resolved_requests: list[tuple[UUID, list[UUID], UUID]] = []

    def get_workspace(self, workspace_id: UUID) -> WorkspaceSummary | None:
        return self.workspace if workspace_id == self.workspace.id else None

    def get_workspace_for_update(self, workspace_id: UUID) -> WorkspaceSummary | None:
        return self.get_workspace(workspace_id)

    def get_active_grant(self, workspace_id: UUID, user_id: UUID) -> WorkspaceGrant | None:
        return self.grants.get((workspace_id, user_id))

    def list_blocks(self, workspace_id: UUID) -> list[SpecificationBlock]:
        return [item for item in self.blocks if item.workspace_id == workspace_id]

    def get_asset(self, workspace_id: UUID, asset_id: UUID) -> Asset | None:
        asset = self.assets.get(asset_id)
        return asset if asset is not None and asset.workspace_id == workspace_id else None

    def list_versions(self, workspace_id: UUID) -> list[SpecificationVersion]:
        return sorted(
            (item for item in self.versions.values() if item.workspace_id == workspace_id),
            key=lambda item: item.number,
            reverse=True,
        )

    def get_version(
        self, workspace_id: UUID, version_id: UUID
    ) -> SpecificationVersion | None:
        version = self.versions.get(version_id)
        return version if version is not None and version.workspace_id == workspace_id else None

    def get_latest_version(self, workspace_id: UUID) -> SpecificationVersion | None:
        versions = self.list_versions(workspace_id)
        return versions[0] if versions else None

    def add_version(self, version: SpecificationVersion) -> None:
        self.versions[version.id] = version

    def resolve_draft_requests(
        self, workspace_id: UUID, block_ids: list[UUID], version_id: UUID
    ) -> int:
        self.resolved_requests.append((workspace_id, block_ids, version_id))
        return len(block_ids)

    def get_review_round(
        self, workspace_id: UUID, review_round_id: UUID
    ) -> ReviewRound | None:
        review_round = self.review_rounds.get(review_round_id)
        return (
            review_round
            if review_round is not None and review_round.workspace_id == workspace_id
            else None
        )

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

    def add_review_round(self, review_round: ReviewRound) -> None:
        self.review_rounds[review_round.id] = review_round

    def mark_workspace_released(
        self,
        workspace_id: UUID,
        *,
        version_id: UUID,
        revision: int,
        updated_at: datetime,
    ) -> None:
        if workspace_id == self.workspace.id:
            self.workspace = replace(
                self.workspace,
                workflow_status="IN_REVIEW",
                latest_version_id=version_id,
                revision=revision,
                updated_at=updated_at,
            )

    def add_audit_event(self, **event: Any) -> None:
        self.audit_events.append(event)

    def add_outbox_message(self, event_type: str, payload: dict[str, Any]) -> None:
        self.outbox_messages.append((event_type, payload))

    def get_idempotent_result(
        self,
        *,
        actor_id: UUID,
        workspace_id: UUID,
        operation: str,
        idempotency_key: str,
    ) -> tuple[str, dict[str, Any]] | None:
        return self.idempotent_results.get(
            (actor_id, workspace_id, operation, idempotency_key)
        )

    def add_idempotent_result(
        self,
        *,
        actor_id: UUID,
        workspace_id: UUID,
        operation: str,
        idempotency_key: str,
        request_fingerprint: str,
        response_payload: dict[str, Any],
    ) -> None:
        self.idempotent_results[(actor_id, workspace_id, operation, idempotency_key)] = (
            request_fingerprint,
            response_payload,
        )

    def record_guest_version_view(
        self,
        *,
        guest_session_id: UUID,
        workspace_id: UUID,
        version_id: UUID,
        viewed_at: datetime,
    ) -> None:
        self.guest_version_views.add((guest_session_id, version_id))


class VersionPhaseTwoTests(unittest.TestCase):
    def setUp(self) -> None:
        self.actor = CurrentActor(
            id=uuid4(),
            email="designer@example.com",
            display_name="Designer",
            system_role=SystemRole.DESIGNER,
        )
        self.workspace = WorkspaceSummary(
            id=uuid4(),
            customer_id=uuid4(),
            customer_name="Customer",
            customer_email=None,
            customer_phone=None,
            product_type="apparel",
            workflow_status="DRAFT",
            record_status="ACTIVE",
            latest_version_id=None,
            approved_version_id=None,
            production_version_id=None,
            revision=4,
            updated_at=datetime.now(UTC),
        )
        self.repository = InMemoryVersionRepository(self.workspace, self.actor)
        self.uow = FakeUnitOfWork()

    def add_text_block(self, *, value: str = "Front print", position: int = 0) -> UUID:
        block_id = uuid4()
        now = datetime.now(UTC)
        self.repository.blocks.append(
            SpecificationBlock(
                id=block_id,
                workspace_id=self.workspace.id,
                block_type=BlockType.TEXT,
                label="Description",
                content={"value": value},
                position=position,
                schema_version=1,
                created_by=self.actor.id,
                updated_by=self.actor.id,
                created_at=now,
                updated_at=now,
            )
        )
        return block_id

    def release(self, idempotency_key: str = "release-default"):
        return ReleaseVersion(self.repository, self.uow).execute(
            actor=self.actor,
            workspace_id=self.workspace.id,
            expected_revision=self.repository.workspace.revision,
            idempotency_key=idempotency_key,
        )

    def test_release_creates_immutable_snapshot_review_round_audit_and_outbox(self) -> None:
        block_id = self.add_text_block()
        version, review_round, revision = self.release()

        self.assertEqual(version.version.number, 1)
        self.assertEqual(version.status, VersionDisplayStatus.IN_REVIEW)
        self.assertEqual(version.version.snapshot[0]["id"], str(block_id))
        self.assertEqual(len(version.version.content_hash), 64)
        self.assertEqual(review_round.status, ReviewRoundStatus.OPEN)
        self.assertEqual(self.repository.workspace.workflow_status, "IN_REVIEW")
        self.assertEqual(self.repository.workspace.latest_version_id, version.version.id)
        self.assertEqual(revision, 5)
        self.assertEqual(self.repository.audit_events[0]["event_type"], "VERSION_RELEASED")
        self.assertEqual(self.repository.outbox_messages[0][0], "VERSION_RELEASED")
        self.assertEqual(self.uow.commits, 1)

    def test_release_resolves_only_requested_blocks_changed_in_new_version(self) -> None:
        changed_block_id = self.add_text_block(value="Màu xanh")
        unchanged_block_id = self.add_text_block(value="Áo thun", position=1)
        previous_snapshot = [
            {"id": str(changed_block_id), "block_type": "text", "label": "Description", "content": {"value": "Màu navy"}, "position": 0, "schema_version": 1},
            {"id": str(unchanged_block_id), "block_type": "text", "label": "Description", "content": {"value": "Áo thun"}, "position": 1, "schema_version": 1},
        ]
        previous = SpecificationVersion(
            id=uuid4(), workspace_id=self.workspace.id, number=1,
            previous_version_id=None, snapshot=previous_snapshot,
            content_hash="old", schema_version=1, created_by=self.actor.id,
            created_at=datetime.now(UTC),
        )
        self.repository.versions[previous.id] = previous

        version, _, _ = ReleaseVersion(self.repository, self.uow).execute(
            actor=self.actor,
            workspace_id=self.workspace.id,
            expected_revision=self.repository.workspace.revision,
            idempotency_key="resolve-changed-block",
            resolved_request_block_ids=[changed_block_id, unchanged_block_id],
        )

        self.assertEqual(version.version.number, 2)
        self.assertEqual(
            self.repository.resolved_requests,
            [(self.workspace.id, [changed_block_id], version.version.id)],
        )
        self.assertEqual(self.repository.audit_events[-1]["metadata"]["resolved_request_count"], 1)

    def test_release_embeds_referenced_asset_identity_and_checksum(self) -> None:
        asset_id = uuid4()
        now = datetime.now(UTC)
        self.repository.assets[asset_id] = Asset(
            id=asset_id,
            workspace_id=self.workspace.id,
            storage_key="artwork.pdf",
            original_filename="artwork.pdf",
            content_type="application/pdf",
            size_bytes=100,
            checksum="a" * 64,
            status=AssetStatus.READY,
            uploaded_by=self.actor.id,
            created_at=now,
        )
        self.repository.blocks.append(
            SpecificationBlock(
                id=uuid4(),
                workspace_id=self.workspace.id,
                block_type=BlockType.FILE,
                label="Artwork",
                content={"asset_id": str(asset_id)},
                position=0,
                schema_version=1,
                created_by=self.actor.id,
                updated_by=self.actor.id,
                created_at=now,
                updated_at=now,
            )
        )

        version, _, _ = self.release()

        self.assertEqual(
            version.version.snapshot[0]["assets"],
            [
                {
                    "asset_id": str(asset_id),
                    "original_filename": "artwork.pdf",
                    "checksum": "a" * 64,
                }
            ],
        )

    def test_release_rejects_empty_invalid_state_and_stale_revision(self) -> None:
        with self.assertRaises(ValidationFailed):
            self.release()

        self.add_text_block()
        with self.assertRaises(PreconditionFailed):
            ReleaseVersion(self.repository, self.uow).execute(
                actor=self.actor,
                workspace_id=self.workspace.id,
                expected_revision=999,
                idempotency_key="stale-release",
            )

        self.repository.workspace = replace(
            self.repository.workspace, workflow_status="APPROVED"
        )
        with self.assertRaises(Conflict):
            self.release("release-identical")

    def test_release_rejects_draft_identical_to_latest_version(self) -> None:
        self.add_text_block()
        first, review_round, _ = self.release()
        self.repository.review_rounds[review_round.id] = replace(
            review_round,
            status=ReviewRoundStatus.CANCELLED,
            closed_at=datetime.now(UTC),
        )
        self.repository.workspace = replace(
            self.repository.workspace,
            workflow_status="DRAFT",
        )

        with self.assertRaises(Conflict):
            self.release("identical-new-attempt")
        self.assertEqual(len(self.repository.versions), 1)
        self.assertEqual(self.repository.get_latest_version(self.workspace.id), first.version)

    def test_release_retry_with_same_idempotency_key_replays_original_result(self) -> None:
        self.add_text_block()
        first_version, first_round, first_revision = self.release("stable-key")

        replayed_version, replayed_round, replayed_revision = self.release("stable-key")

        self.assertEqual(replayed_version.version.id, first_version.version.id)
        self.assertEqual(replayed_round.id, first_round.id)
        self.assertEqual(replayed_revision, first_revision)
        self.assertEqual(len(self.repository.versions), 1)
        self.assertEqual(len(self.repository.review_rounds), 1)
        self.assertEqual(len(self.repository.outbox_messages), 1)
        self.assertEqual(self.uow.commits, 1)

    def test_structured_diff_separates_content_changes_and_reorder(self) -> None:
        first_id, removed_id, added_id = uuid4(), uuid4(), uuid4()
        first = self.make_version(
            1,
            [
                self.snapshot_block(first_id, "Old", 0),
                self.snapshot_block(removed_id, "Removed", 1),
            ],
        )
        second = self.make_version(
            2,
            [
                self.snapshot_block(first_id, "New", 1),
                self.snapshot_block(added_id, "Added", 0),
            ],
            previous_version_id=first.id,
        )
        self.repository.versions = {first.id: first, second.id: second}

        diff = GetVersionDiff(self.repository).execute(
            self.actor, self.workspace.id, second.id
        )

        self.assertEqual(diff.base_version_id, first.id)
        self.assertEqual([item["id"] for item in diff.added], [str(added_id)])
        self.assertEqual([item["id"] for item in diff.removed], [str(removed_id)])
        self.assertEqual(diff.changed[0].field_path, "content.value")
        self.assertEqual((diff.changed[0].before, diff.changed[0].after), ("Old", "New"))
        self.assertEqual(diff.reordered[0].block_id, first_id)

    def test_guest_can_read_only_its_workspace_versions_and_review_round(self) -> None:
        self.add_text_block()
        version, review_round, _ = self.release()
        guest = GuestPrincipal(
            session_id=uuid4(),
            review_link_id=uuid4(),
            workspace_id=self.workspace.id,
            username="Customer A",
            link_version=1,
        )

        listed = ListVersions(self.repository).execute(guest, self.workspace.id)
        detail = GetVersion(self.repository, self.uow).execute(
            guest, self.workspace.id, version.version.id
        )
        round_detail = GetReviewRound(self.repository).execute(
            guest, self.workspace.id, review_round.id
        )

        self.assertEqual(listed[0].version.id, version.version.id)
        self.assertEqual(detail.status, VersionDisplayStatus.IN_REVIEW)
        self.assertIn(
            (guest.session_id, version.version.id), self.repository.guest_version_views
        )
        self.assertEqual(round_detail.id, review_round.id)
        with self.assertRaises(ResourceNotFound):
            ListVersions(self.repository).execute(guest, uuid4())

    def test_admin_cannot_read_or_release_versions(self) -> None:
        admin = replace(self.actor, system_role=SystemRole.ADMIN)
        with self.assertRaises(PermissionDenied):
            ListVersions(self.repository).execute(admin, self.workspace.id)

    def test_http_release_returns_created_version_and_new_etag(self) -> None:
        self.add_text_block()
        app = create_app()
        app.dependency_overrides[get_current_actor] = lambda: self.actor
        app.dependency_overrides[get_release_version] = lambda: ReleaseVersion(
            self.repository, self.uow
        )

        with TestClient(app) as client:
            response = client.post(
                f"/api/v1/workspaces/{self.workspace.id}/versions",
                headers={
                    "If-Match": 'W/"4"',
                    "Idempotency-Key": "http-release-1",
                },
            )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.headers["etag"], 'W/"5"')
        self.assertEqual(response.json()["version"]["number"], 1)
        self.assertEqual(response.json()["review_round"]["status"], "OPEN")

    def test_http_guest_cookie_can_read_versions_without_an_account(self) -> None:
        self.add_text_block()
        version, _, _ = self.release("guest-readable-release")
        guest = GuestPrincipal(
            session_id=uuid4(),
            review_link_id=uuid4(),
            workspace_id=self.workspace.id,
            username="Customer A",
            link_version=1,
        )
        app = create_app()
        app.dependency_overrides[get_resolve_current_actor] = lambda: SimpleNamespace(
            execute=lambda _token: self.actor
        )
        app.dependency_overrides[get_resolve_guest_session] = lambda: SimpleNamespace(
            execute=lambda _token: guest
        )
        app.dependency_overrides[get_list_versions] = lambda: ListVersions(self.repository)

        with TestClient(app) as client:
            client.cookies.set(settings.guest_session_cookie_name, "guest-token")
            response = client.get(
                f"/api/v1/workspaces/{self.workspace.id}/versions",
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()[0]["id"], str(version.version.id))

    def make_version(
        self,
        number: int,
        snapshot: list[dict[str, Any]],
        previous_version_id: UUID | None = None,
    ) -> SpecificationVersion:
        return SpecificationVersion(
            id=uuid4(),
            workspace_id=self.workspace.id,
            number=number,
            previous_version_id=previous_version_id,
            snapshot=snapshot,
            content_hash=str(number) * 64,
            schema_version=1,
            created_by=self.actor.id,
            created_at=datetime.now(UTC),
        )

    @staticmethod
    def snapshot_block(block_id: UUID, value: str, position: int) -> dict[str, Any]:
        return {
            "id": str(block_id),
            "block_type": "text",
            "label": "Description",
            "content": {"value": value},
            "position": position,
            "schema_version": 1,
        }


if __name__ == "__main__":
    unittest.main()
