import hashlib
import re
from dataclasses import replace
from datetime import UTC, datetime
from uuid import UUID, uuid4

from proofprint.domain.entities.draft import (
    Asset,
    AssetStatus,
    BlockType,
    SpecificationBlock,
    validate_block_content,
)
from proofprint.domain.entities.identity import CurrentActor, SystemRole
from proofprint.domain.entities.workspace import WorkspaceGrant, WorkspaceSummary
from proofprint.domain.exceptions import (
    Conflict,
    PermissionDenied,
    PreconditionFailed,
    ResourceNotFound,
    ValidationFailed,
)
from proofprint.domain.interfaces.draft import AssetAttestationVerifier, DraftRepository
from proofprint.domain.interfaces.review_access import UnitOfWork


class GetDraft:
    def __init__(self, drafts: DraftRepository) -> None:
        self.drafts = drafts

    def execute(
        self, actor: CurrentActor, workspace_id: UUID
    ) -> tuple[WorkspaceSummary, WorkspaceGrant, list[SpecificationBlock]]:
        grant = _authorize(actor, self.drafts, workspace_id, edit=False)
        workspace = self.drafts.get_workspace(workspace_id)
        if workspace is None:
            raise ResourceNotFound("Workspace was not found")
        return workspace, grant, self.drafts.list_blocks(workspace_id)


class UpsertDraftBlock:
    def __init__(self, drafts: DraftRepository, unit_of_work: UnitOfWork) -> None:
        self.drafts = drafts
        self.unit_of_work = unit_of_work

    def execute(
        self,
        *,
        actor: CurrentActor,
        workspace_id: UUID,
        block_id: UUID,
        block_type: BlockType,
        label: str,
        content: dict[str, object],
        position: int,
        schema_version: int,
        expected_revision: int,
    ) -> tuple[SpecificationBlock, int]:
        _authorize(actor, self.drafts, workspace_id, edit=True)
        workspace = self.drafts.get_workspace_for_update(workspace_id)
        normalized_label = label.strip()
        if not normalized_label:
            raise ValidationFailed("label must not be blank")
        if len(normalized_label) > 200:
            raise ValidationFailed("label must not exceed 200 characters")
        if position < 0:
            raise ValidationFailed("position must not be negative")
        if schema_version < 1:
            raise ValidationFailed("schema_version must be positive")
        referenced_assets = validate_block_content(block_type, content)
        for asset_id in referenced_assets:
            asset = self.drafts.get_asset(workspace_id, asset_id)
            if asset is None or asset.status != AssetStatus.READY:
                raise ValidationFailed("Referenced asset must be READY in this workspace")

        existing = self.drafts.get_block(workspace_id, block_id)
        if (
            workspace is not None
            and workspace.record_status == "ACTIVE"
            and workspace.workflow_status == "DRAFT"
            and workspace.revision in {expected_revision, expected_revision + 1}
            and existing is not None
            and existing.block_type == block_type
            and existing.label == normalized_label
            and existing.content == content
            and existing.position == position
            and existing.schema_version == schema_version
            and (
                workspace.revision == expected_revision
                or (
                    existing.updated_at == workspace.updated_at
                    and existing.updated_by == actor.id
                )
            )
        ):
            return existing, workspace.revision
        _require_editable(workspace, expected_revision)
        now = datetime.now(UTC)
        block = SpecificationBlock(
            id=block_id,
            workspace_id=workspace_id,
            block_type=block_type,
            label=normalized_label,
            content=content,
            position=position,
            schema_version=schema_version,
            created_by=existing.created_by if existing is not None else actor.id,
            updated_by=actor.id,
            created_at=existing.created_at if existing is not None else now,
            updated_at=now,
        )
        next_revision = expected_revision + 1
        try:
            self.drafts.upsert_block(block)
            self.drafts.update_workspace(
                workspace_id, revision=next_revision, updated_at=now
            )
            self.drafts.add_audit_event(
                workspace_id=workspace_id,
                actor_id=actor.id,
                event_type="DRAFT_BLOCK_UPSERTED",
                entity_type="SpecificationBlock",
                entity_id=block.id,
                metadata={
                    "block_type": block.block_type.value,
                    "position": block.position,
                    "workspace_revision": next_revision,
                },
            )
            self.unit_of_work.commit()
        except Exception:
            self.unit_of_work.rollback()
            raise
        return block, next_revision


class DeleteDraftBlock:
    def __init__(self, drafts: DraftRepository, unit_of_work: UnitOfWork) -> None:
        self.drafts = drafts
        self.unit_of_work = unit_of_work

    def execute(
        self,
        *,
        actor: CurrentActor,
        workspace_id: UUID,
        block_id: UUID,
        expected_revision: int,
    ) -> int:
        _authorize(actor, self.drafts, workspace_id, edit=True)
        workspace = self.drafts.get_workspace_for_update(workspace_id)
        _require_editable(workspace, expected_revision)
        if self.drafts.get_block(workspace_id, block_id) is None:
            raise ResourceNotFound("Specification block was not found")

        next_revision = expected_revision + 1
        now = datetime.now(UTC)
        try:
            self.drafts.delete_block(workspace_id, block_id)
            self.drafts.update_workspace(
                workspace_id, revision=next_revision, updated_at=now
            )
            self.drafts.add_audit_event(
                workspace_id=workspace_id,
                actor_id=actor.id,
                event_type="DRAFT_BLOCK_DELETED",
                entity_type="SpecificationBlock",
                entity_id=block_id,
                metadata={"workspace_revision": next_revision},
            )
            self.unit_of_work.commit()
        except Exception:
            self.unit_of_work.rollback()
            raise
        return next_revision


class ReorderDraftBlocks:
    def __init__(self, drafts: DraftRepository, unit_of_work: UnitOfWork) -> None:
        self.drafts = drafts
        self.unit_of_work = unit_of_work

    def execute(
        self,
        *,
        actor: CurrentActor,
        workspace_id: UUID,
        block_ids: list[UUID],
        expected_revision: int,
    ) -> tuple[list[SpecificationBlock], int]:
        _authorize(actor, self.drafts, workspace_id, edit=True)
        workspace = self.drafts.get_workspace_for_update(workspace_id)
        _require_editable(workspace, expected_revision)
        existing = self.drafts.list_blocks(workspace_id)
        existing_ids = [item.id for item in existing]
        if len(block_ids) != len(set(block_ids)) or set(block_ids) != set(existing_ids):
            raise ValidationFailed("block_ids must contain every draft block exactly once")

        next_revision = expected_revision + 1
        now = datetime.now(UTC)
        try:
            self.drafts.set_block_positions(
                workspace_id,
                block_ids,
                updated_by=actor.id,
                updated_at=now,
            )
            self.drafts.update_workspace(
                workspace_id, revision=next_revision, updated_at=now
            )
            self.drafts.add_audit_event(
                workspace_id=workspace_id,
                actor_id=actor.id,
                event_type="DRAFT_BLOCKS_REORDERED",
                entity_type="OrderWorkspace",
                entity_id=workspace_id,
                metadata={
                    "block_ids": [str(item) for item in block_ids],
                    "workspace_revision": next_revision,
                },
            )
            self.unit_of_work.commit()
        except Exception:
            self.unit_of_work.rollback()
            raise
        return self.drafts.list_blocks(workspace_id), next_revision


class RegisterAsset:
    """Register metadata for a file that has already completed external upload."""

    def __init__(
        self, drafts: DraftRepository, unit_of_work: UnitOfWork,
        attestation_verifier: AssetAttestationVerifier,
    ) -> None:
        self.drafts = drafts
        self.unit_of_work = unit_of_work
        self.attestation_verifier = attestation_verifier

    def execute(
        self,
        *,
        actor: CurrentActor,
        workspace_id: UUID,
        storage_key: str,
        original_filename: str,
        content_type: str,
        size_bytes: int,
        checksum: str,
        attestation: str,
        expected_revision: int,
    ) -> tuple[Asset, int]:
        _authorize(actor, self.drafts, workspace_id, edit=True)
        workspace = self.drafts.get_workspace_for_update(workspace_id)
        _require_editable(workspace, expected_revision)
        normalized_key = storage_key.strip()
        normalized_checksum = checksum.strip().lower()
        if not normalized_key:
            raise ValidationFailed("storage_key must not be blank")
        if len(normalized_key) > 1024:
            raise ValidationFailed("storage_key must not exceed 1024 characters")
        if not original_filename.strip():
            raise ValidationFailed("original_filename must not be blank")
        if len(original_filename.strip()) > 500:
            raise ValidationFailed("original_filename must not exceed 500 characters")
        if not content_type.strip():
            raise ValidationFailed("content_type must not be blank")
        if len(content_type.strip()) > 255:
            raise ValidationFailed("content_type must not exceed 255 characters")
        if size_bytes < 0:
            raise ValidationFailed("size_bytes must not be negative")
        if self.drafts.storage_key_exists(normalized_key):
            raise Conflict("An asset with this storage key already exists")
        if not re.fullmatch(r"[0-9a-f]{64}", normalized_checksum):
            raise ValidationFailed("checksum must be a SHA-256 hex digest")
        if not self.attestation_verifier.verify(
            workspace_id=workspace_id,
            storage_key=normalized_key,
            content_type=content_type.strip().lower(),
            size_bytes=size_bytes,
            checksum=normalized_checksum,
            attestation=attestation,
        ):
            raise ValidationFailed("Asset upload and scan attestation is invalid")

        now = datetime.now(UTC)
        asset = Asset(
            id=uuid4(),
            workspace_id=workspace_id,
            storage_key=normalized_key,
            original_filename=original_filename.strip(),
            content_type=content_type.strip().lower(),
            size_bytes=size_bytes,
            checksum=normalized_checksum,
            status=AssetStatus.READY,
            uploaded_by=actor.id,
            created_at=now,
        )
        next_revision = expected_revision + 1
        try:
            self.drafts.add_asset(asset)
            self.drafts.update_workspace(
                workspace_id, revision=next_revision, updated_at=now
            )
            self.drafts.add_audit_event(
                workspace_id=workspace_id,
                actor_id=actor.id,
                event_type="ASSET_REGISTERED",
                entity_type="Asset",
                entity_id=asset.id,
                metadata={
                    "checksum": asset.checksum,
                    "content_type": asset.content_type,
                    "workspace_revision": next_revision,
                },
            )
            self.unit_of_work.commit()
        except Exception:
            self.unit_of_work.rollback()
            raise
        return asset, next_revision


class GetAsset:
    def __init__(self, drafts: DraftRepository) -> None:
        self.drafts = drafts

    def execute(self, actor: CurrentActor, workspace_id: UUID, asset_id: UUID) -> Asset:
        _authorize(actor, self.drafts, workspace_id, edit=False)
        if self.drafts.get_workspace(workspace_id) is None:
            raise ResourceNotFound("Workspace was not found")
        asset = self.drafts.get_asset(workspace_id, asset_id)
        if asset is None:
            raise ResourceNotFound("Asset was not found")
        return asset


class StartRevision:
    def __init__(self, drafts: DraftRepository, unit_of_work: UnitOfWork) -> None:
        self.drafts = drafts
        self.unit_of_work = unit_of_work

    def execute(
        self,
        *,
        actor: CurrentActor,
        workspace_id: UUID,
        reason: str,
        expected_revision: int,
        idempotency_key: str,
    ) -> WorkspaceSummary:
        _authorize(actor, self.drafts, workspace_id, edit=True)
        workspace = self.drafts.get_workspace_for_update(workspace_id)
        if workspace is None:
            raise ResourceNotFound("Workspace was not found")
        key = idempotency_key.strip()
        if not key or len(key) > 200:
            raise ValidationFailed("Idempotency-Key must contain 1 to 200 characters")
        normalized_reason = reason.strip()
        fingerprint = hashlib.sha256(normalized_reason.encode("utf-8")).hexdigest()
        replay = self.drafts.get_start_revision_result(actor.id, workspace_id, key)
        if replay is not None:
            stored_fingerprint, payload = replay
            if stored_fingerprint != fingerprint:
                raise Conflict("Idempotency-Key was already used with another request")
            return _workspace_from_payload(payload)
        _require_revision(workspace, expected_revision)
        if workspace.record_status != "ACTIVE":
            raise Conflict("Workspace must be ACTIVE to start a revision")
        if workspace.workflow_status not in {"APPROVED", "LOCKED_FOR_PRODUCTION"}:
            raise Conflict("A revision can only start after approval or production lock")
        if len(normalized_reason) < 3:
            raise ValidationFailed("reason must contain at least 3 characters")
        if len(normalized_reason) > 500:
            raise ValidationFailed("reason must not exceed 500 characters")

        now = datetime.now(UTC)
        next_revision = expected_revision + 1
        updated = replace(
            workspace, revision=next_revision, updated_at=now, workflow_status="DRAFT"
        )
        try:
            self.drafts.update_workspace(
                workspace_id,
                revision=next_revision,
                updated_at=now,
                workflow_status="DRAFT",
            )
            self.drafts.add_audit_event(
                workspace_id=workspace_id,
                actor_id=actor.id,
                event_type="REVISION_STARTED",
                entity_type="OrderWorkspace",
                entity_id=workspace_id,
                metadata={
                    "previous_workflow_status": workspace.workflow_status,
                    "reason": normalized_reason,
                    "workspace_revision": next_revision,
                },
            )
            self.drafts.add_start_revision_result(
                actor.id, workspace_id, key, fingerprint, _workspace_payload(updated)
            )
            self.unit_of_work.commit()
        except Exception:
            self.unit_of_work.rollback()
            raise
        return updated


def _workspace_payload(workspace: WorkspaceSummary) -> dict[str, str | int | None]:
    return {
        "id": str(workspace.id),
        "customer_id": str(workspace.customer_id),
        "customer_name": workspace.customer_name,
        "customer_email": workspace.customer_email,
        "customer_phone": workspace.customer_phone,
        "product_type": workspace.product_type,
        "workflow_status": workspace.workflow_status,
        "record_status": workspace.record_status,
        "latest_version_id": str(workspace.latest_version_id) if workspace.latest_version_id else None,
        "approved_version_id": (
            str(workspace.approved_version_id) if workspace.approved_version_id else None
        ),
        "production_version_id": (
            str(workspace.production_version_id) if workspace.production_version_id else None
        ),
        "revision": workspace.revision,
        "updated_at": workspace.updated_at.isoformat(),
    }


def _workspace_from_payload(payload: dict[str, object]) -> WorkspaceSummary:
    return WorkspaceSummary(
        id=UUID(str(payload["id"])),
        customer_id=UUID(str(payload["customer_id"])),
        customer_name=str(payload["customer_name"]),
        customer_email=str(payload["customer_email"]) if payload["customer_email"] else None,
        customer_phone=str(payload["customer_phone"]) if payload["customer_phone"] else None,
        product_type=str(payload["product_type"]),
        workflow_status=str(payload["workflow_status"]),
        record_status=str(payload["record_status"]),
        latest_version_id=(
            UUID(str(payload["latest_version_id"])) if payload["latest_version_id"] else None
        ),
        approved_version_id=(
            UUID(str(payload["approved_version_id"])) if payload["approved_version_id"] else None
        ),
        production_version_id=(
            UUID(str(payload["production_version_id"]))
            if payload["production_version_id"] else None
        ),
        revision=int(str(payload["revision"])),
        updated_at=datetime.fromisoformat(str(payload["updated_at"])),
    )


def _authorize(
    actor: CurrentActor,
    drafts: DraftRepository,
    workspace_id: UUID,
    *,
    edit: bool,
) -> WorkspaceGrant:
    if actor.system_role != SystemRole.DESIGNER:
        raise PermissionDenied("Only designers can access workspace drafts")
    grant = drafts.get_active_grant(workspace_id, actor.id)
    if grant is None:
        raise ResourceNotFound("Workspace was not found")
    allowed = grant.can_edit if edit else grant.can_view
    if not allowed:
        raise PermissionDenied("You do not have permission for this workspace action")
    return grant


def _require_editable(
    workspace: WorkspaceSummary | None, expected_revision: int
) -> WorkspaceSummary:
    if workspace is None:
        raise ResourceNotFound("Workspace was not found")
    _require_revision(workspace, expected_revision)
    if workspace.record_status != "ACTIVE":
        raise Conflict("Workspace must be ACTIVE to edit the draft")
    if workspace.workflow_status != "DRAFT":
        raise Conflict("Workspace must be in DRAFT to edit specification blocks")
    return workspace


def _require_revision(workspace: WorkspaceSummary, expected_revision: int) -> None:
    if workspace.revision != expected_revision:
        raise PreconditionFailed("Workspace revision does not match If-Match")
