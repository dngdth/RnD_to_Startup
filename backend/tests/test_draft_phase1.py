import unittest
from dataclasses import replace
from datetime import UTC, datetime
from typing import Any
from uuid import UUID, uuid4

from fastapi.testclient import TestClient

from proofprint.application.use_cases import (
    DeleteDraftBlock,
    GetDraft,
    RegisterAsset,
    ReorderDraftBlocks,
    StartRevision,
    UpsertDraftBlock,
)
from proofprint.domain.entities.draft import Asset, AssetStatus, BlockType, SpecificationBlock
from proofprint.domain.entities.identity import CurrentActor, SystemRole
from proofprint.domain.entities.workspace import WorkspaceGrant, WorkspaceSummary
from proofprint.domain.exceptions import (
    Conflict,
    PermissionDenied,
    PreconditionFailed,
    ResourceNotFound,
    ValidationFailed,
)
from proofprint.main import create_app
from proofprint.presentation.api.dependencies import (
    get_current_actor,
    get_upsert_draft_block,
    parse_if_match,
)
from proofprint.presentation.schemas.draft import AssetResponse, SpecificationBlockResponse


class FakeUnitOfWork:
    def __init__(self) -> None:
        self.commits = 0
        self.rollbacks = 0

    def commit(self) -> None:
        self.commits += 1

    def rollback(self) -> None:
        self.rollbacks += 1


class InMemoryDraftRepository:
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
        self.blocks: dict[UUID, SpecificationBlock] = {}
        self.assets: dict[UUID, Asset] = {}
        self.audit_events: list[dict[str, object]] = []

    def get_workspace(self, workspace_id: UUID) -> WorkspaceSummary | None:
        return self.workspace if workspace_id == self.workspace.id else None

    def get_workspace_for_update(self, workspace_id: UUID) -> WorkspaceSummary | None:
        return self.get_workspace(workspace_id)

    def get_active_grant(self, workspace_id: UUID, user_id: UUID) -> WorkspaceGrant | None:
        return self.grants.get((workspace_id, user_id))

    def list_blocks(self, workspace_id: UUID) -> list[SpecificationBlock]:
        return sorted(
            (item for item in self.blocks.values() if item.workspace_id == workspace_id),
            key=lambda item: (item.position, item.id),
        )

    def get_block(self, workspace_id: UUID, block_id: UUID) -> SpecificationBlock | None:
        block = self.blocks.get(block_id)
        return block if block is not None and block.workspace_id == workspace_id else None

    def upsert_block(self, block: SpecificationBlock) -> None:
        self.blocks[block.id] = block

    def delete_block(self, workspace_id: UUID, block_id: UUID) -> None:
        if self.get_block(workspace_id, block_id) is not None:
            del self.blocks[block_id]

    def set_block_positions(
        self,
        workspace_id: UUID,
        block_ids: list[UUID],
        *,
        updated_by: UUID,
        updated_at: datetime,
    ) -> None:
        for position, block_id in enumerate(block_ids):
            block = self.blocks[block_id]
            self.blocks[block_id] = replace(
                block,
                position=position,
                updated_by=updated_by,
                updated_at=updated_at,
            )

    def update_workspace(
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

    def add_asset(self, asset: Asset) -> None:
        self.assets[asset.id] = asset

    def get_asset(self, workspace_id: UUID, asset_id: UUID) -> Asset | None:
        asset = self.assets.get(asset_id)
        return asset if asset is not None and asset.workspace_id == workspace_id else None

    def storage_key_exists(self, storage_key: str) -> bool:
        return any(item.storage_key == storage_key for item in self.assets.values())

    def add_audit_event(self, **event: Any) -> None:
        self.audit_events.append(event)


class DraftPhaseOneTests(unittest.TestCase):
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
            revision=0,
            updated_at=datetime.now(UTC),
        )
        self.repository = InMemoryDraftRepository(self.workspace, self.actor)
        self.uow = FakeUnitOfWork()

    def upsert(
        self,
        block_id: UUID,
        *,
        content: dict[str, object] | None = None,
        position: int = 0,
    ) -> tuple[SpecificationBlock, int]:
        return UpsertDraftBlock(self.repository, self.uow).execute(
            actor=self.actor,
            workspace_id=self.workspace.id,
            block_id=block_id,
            block_type=BlockType.TEXT,
            label="Description",
            content=content or {"value": "Front print"},
            position=position,
            schema_version=1,
            expected_revision=self.repository.workspace.revision,
        )

    def test_upsert_and_delete_increment_revision_and_write_audit(self) -> None:
        block_id = uuid4()
        block, revision = self.upsert(block_id)

        self.assertEqual(revision, 1)
        self.assertEqual(block.created_by, self.actor.id)
        self.assertEqual(self.repository.workspace.revision, 1)
        self.assertEqual(self.repository.audit_events[-1]["event_type"], "DRAFT_BLOCK_UPSERTED")

        deleted_revision = DeleteDraftBlock(self.repository, self.uow).execute(
            actor=self.actor,
            workspace_id=self.workspace.id,
            block_id=block_id,
            expected_revision=1,
        )
        self.assertEqual(deleted_revision, 2)
        self.assertNotIn(block_id, self.repository.blocks)
        self.assertEqual(self.uow.commits, 2)

    def test_stale_revision_and_non_draft_workspace_are_rejected(self) -> None:
        with self.assertRaises(PreconditionFailed):
            UpsertDraftBlock(self.repository, self.uow).execute(
                actor=self.actor,
                workspace_id=self.workspace.id,
                block_id=uuid4(),
                block_type=BlockType.TEXT,
                label="Description",
                content={"value": "Front print"},
                position=0,
                schema_version=1,
                expected_revision=5,
            )

        self.repository.workspace = replace(self.repository.workspace, workflow_status="IN_REVIEW")
        with self.assertRaises(Conflict):
            self.upsert(uuid4())
        self.assertEqual(self.uow.commits, 0)

    def test_asset_must_be_ready_and_belong_to_workspace(self) -> None:
        asset, revision = RegisterAsset(self.repository, self.uow).execute(
            actor=self.actor,
            workspace_id=self.workspace.id,
            storage_key=f"workspaces/{self.workspace.id}/artwork.pdf",
            original_filename="artwork.pdf",
            content_type="application/pdf",
            size_bytes=1200,
            checksum="a" * 64,
            expected_revision=0,
        )
        self.assertEqual(asset.status, AssetStatus.READY)
        self.assertEqual(revision, 1)

        block, block_revision = UpsertDraftBlock(self.repository, self.uow).execute(
            actor=self.actor,
            workspace_id=self.workspace.id,
            block_id=uuid4(),
            block_type=BlockType.FILE,
            label="Artwork",
            content={"asset_id": str(asset.id)},
            position=0,
            schema_version=1,
            expected_revision=1,
        )
        self.assertEqual(block.content["asset_id"], str(asset.id))
        self.assertEqual(block_revision, 2)

        with self.assertRaises(ValidationFailed):
            UpsertDraftBlock(self.repository, self.uow).execute(
                actor=self.actor,
                workspace_id=self.workspace.id,
                block_id=uuid4(),
                block_type=BlockType.IMAGE,
                label="Mockup",
                content={"asset_id": str(uuid4())},
                position=1,
                schema_version=1,
                expected_revision=2,
            )

    def test_reorder_requires_every_block_exactly_once(self) -> None:
        first_id, second_id = uuid4(), uuid4()
        self.upsert(first_id, position=0)
        self.upsert(second_id, position=1)

        with self.assertRaises(ValidationFailed):
            ReorderDraftBlocks(self.repository, self.uow).execute(
                actor=self.actor,
                workspace_id=self.workspace.id,
                block_ids=[first_id],
                expected_revision=2,
            )

        blocks, revision = ReorderDraftBlocks(self.repository, self.uow).execute(
            actor=self.actor,
            workspace_id=self.workspace.id,
            block_ids=[second_id, first_id],
            expected_revision=2,
        )
        self.assertEqual([item.id for item in blocks], [second_id, first_id])
        self.assertEqual(revision, 3)
        self.assertTrue(all(item.updated_by == self.actor.id for item in blocks))

    def test_start_revision_preserves_version_pointers(self) -> None:
        approved_id, production_id = uuid4(), uuid4()
        self.repository.workspace = replace(
            self.repository.workspace,
            workflow_status="LOCKED_FOR_PRODUCTION",
            approved_version_id=approved_id,
            production_version_id=production_id,
        )

        updated = StartRevision(self.repository, self.uow).execute(
            actor=self.actor,
            workspace_id=self.workspace.id,
            reason="Customer requested a new color",
            expected_revision=0,
        )

        self.assertEqual(updated.workflow_status, "DRAFT")
        self.assertEqual(updated.approved_version_id, approved_id)
        self.assertEqual(updated.production_version_id, production_id)
        self.assertEqual(updated.revision, 1)

    def test_admin_is_denied_and_non_member_workspace_is_hidden(self) -> None:
        admin = replace(self.actor, system_role=SystemRole.ADMIN)
        with self.assertRaises(PermissionDenied):
            GetDraft(self.repository).execute(admin, self.workspace.id)

        stranger = replace(self.actor, id=uuid4())
        with self.assertRaises(ResourceNotFound):
            GetDraft(self.repository).execute(stranger, self.workspace.id)

    def test_etag_parser_and_slotted_response_mapping(self) -> None:
        block, _ = self.upsert(uuid4())
        asset = Asset(
            id=uuid4(),
            workspace_id=self.workspace.id,
            storage_key="key",
            original_filename="file.pdf",
            content_type="application/pdf",
            size_bytes=10,
            checksum="b" * 64,
            status=AssetStatus.READY,
            uploaded_by=self.actor.id,
            created_at=datetime.now(UTC),
        )

        self.assertEqual(parse_if_match('W/"12"'), 12)
        self.assertEqual(SpecificationBlockResponse.from_domain(block).id, block.id)
        self.assertEqual(AssetResponse.from_domain(asset).id, asset.id)
        with self.assertRaises(ValidationFailed):
            parse_if_match("not-a-revision")

    def test_http_mutation_returns_new_etag_and_stale_write_returns_412(self) -> None:
        app = create_app()
        app.dependency_overrides[get_current_actor] = lambda: self.actor
        app.dependency_overrides[get_upsert_draft_block] = lambda: UpsertDraftBlock(
            self.repository, self.uow
        )
        path = f"/api/v1/workspaces/{self.workspace.id}/blocks/{uuid4()}"
        payload = {
            "block_type": "text",
            "label": "Description",
            "content": {"value": "Front print"},
            "position": 0,
            "schema_version": 1,
        }

        with TestClient(app) as client:
            created = client.put(path, json=payload, headers={"If-Match": 'W/"0"'})
            stale = client.put(path, json=payload, headers={"If-Match": 'W/"0"'})

        self.assertEqual(created.status_code, 200)
        self.assertEqual(created.headers["etag"], 'W/"1"')
        self.assertEqual(created.json()["workspace_revision"], 1)
        self.assertEqual(stale.status_code, 412)
        self.assertIn("revision", stale.json()["detail"])


if __name__ == "__main__":
    unittest.main()
