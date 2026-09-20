from __future__ import annotations

import hashlib
import json
from copy import deepcopy
from datetime import UTC, datetime
from enum import Enum
from typing import Any
from uuid import UUID, uuid4

from proofprint.domain.entities.draft import AssetStatus, SpecificationBlock, validate_block_content
from proofprint.domain.entities.identity import CurrentActor, SystemRole
from proofprint.domain.entities.review_access import GuestPrincipal
from proofprint.domain.entities.version import (
    BlockReorder,
    FieldChange,
    ReviewRound,
    ReviewRoundStatus,
    SpecificationVersion,
    StructuredDiff,
    VersionDisplayStatus,
    VersionWithStatus,
)
from proofprint.domain.entities.workspace import WorkspaceSummary
from proofprint.domain.exceptions import (
    Conflict,
    PermissionDenied,
    PreconditionFailed,
    ResourceNotFound,
    ValidationFailed,
)
from proofprint.domain.interfaces.review_access import UnitOfWork
from proofprint.domain.interfaces.version import VersionRepository

WorkspaceViewer = CurrentActor | GuestPrincipal
RELEASE_OPERATION = "release-version"
RELEASE_FINGERPRINT = hashlib.sha256(b"release-version:v1").hexdigest()


class ReleaseVersion:
    def __init__(self, versions: VersionRepository, unit_of_work: UnitOfWork) -> None:
        self.versions = versions
        self.unit_of_work = unit_of_work

    def execute(
        self,
        *,
        actor: CurrentActor,
        workspace_id: UUID,
        expected_revision: int,
        idempotency_key: str,
    ) -> tuple[VersionWithStatus, ReviewRound, int]:
        normalized_key = idempotency_key.strip()
        if not normalized_key or len(normalized_key) > 200:
            raise ValidationFailed("Idempotency-Key must contain 1 to 200 characters")
        _authorize_designer(actor, self.versions, workspace_id, edit=True)
        workspace = self.versions.get_workspace_for_update(workspace_id)
        if workspace is None:
            raise ResourceNotFound("Workspace was not found")
        replay = self.versions.get_idempotent_result(
            actor_id=actor.id,
            workspace_id=workspace_id,
            operation=RELEASE_OPERATION,
            idempotency_key=normalized_key,
        )
        if replay is not None:
            fingerprint, payload = replay
            if fingerprint != RELEASE_FINGERPRINT:
                raise Conflict("Idempotency-Key was already used with another request")
            version = self.versions.get_version(workspace_id, UUID(payload["version_id"]))
            if version is None:
                raise Conflict("Stored idempotent release result is no longer available")
            review_round = ReviewRound(
                id=UUID(payload["review_round_id"]),
                workspace_id=workspace_id,
                version_id=version.id,
                status=ReviewRoundStatus(payload["review_round_status"]),
                opened_at=datetime.fromisoformat(payload["review_round_opened_at"]),
                closed_at=(
                    datetime.fromisoformat(payload["review_round_closed_at"])
                    if payload.get("review_round_closed_at")
                    else None
                ),
                decided_by=(
                    UUID(payload["review_round_decided_by"])
                    if payload.get("review_round_decided_by")
                    else None
                ),
                decision_note=payload.get("review_round_decision_note"),
            )
            return (
                VersionWithStatus(version, VersionDisplayStatus.IN_REVIEW),
                review_round,
                int(payload["workspace_revision"]),
            )
        if workspace.revision != expected_revision:
            raise PreconditionFailed("Workspace revision does not match If-Match")
        if workspace.record_status != "ACTIVE":
            raise Conflict("Workspace must be ACTIVE to release a version")
        if workspace.workflow_status != "DRAFT":
            raise Conflict("Workspace must be in DRAFT to release a version")
        if self.versions.get_open_review_round(workspace_id) is not None:
            raise Conflict("Workspace already has an open review round")

        blocks = self.versions.list_blocks(workspace_id)
        if not blocks:
            raise ValidationFailed("Draft must contain at least one block")
        snapshot = _build_snapshot(self.versions, workspace_id, blocks)
        content_hash = _content_hash(snapshot)
        latest = self.versions.get_latest_version(workspace_id)
        if latest is not None and latest.content_hash == content_hash:
            raise Conflict("Draft is identical to the latest released version")

        now = datetime.now(UTC)
        version = SpecificationVersion(
            id=uuid4(),
            workspace_id=workspace_id,
            number=latest.number + 1 if latest is not None else 1,
            previous_version_id=latest.id if latest is not None else None,
            snapshot=snapshot,
            content_hash=content_hash,
            schema_version=1,
            created_by=actor.id,
            created_at=now,
        )
        review_round = ReviewRound(
            id=uuid4(),
            workspace_id=workspace_id,
            version_id=version.id,
            status=ReviewRoundStatus.OPEN,
            opened_at=now,
        )
        next_revision = expected_revision + 1

        try:
            self.versions.add_version(version)
            self.versions.add_review_round(review_round)
            self.versions.mark_workspace_released(
                workspace_id,
                version_id=version.id,
                revision=next_revision,
                updated_at=now,
            )
            self.versions.add_audit_event(
                workspace_id=workspace_id,
                actor_id=actor.id,
                event_type="VERSION_RELEASED",
                entity_type="SpecificationVersion",
                entity_id=version.id,
                version_id=version.id,
                metadata={
                    "number": version.number,
                    "content_hash": version.content_hash,
                    "review_round_id": str(review_round.id),
                    "workspace_revision": next_revision,
                },
            )
            self.versions.add_outbox_message(
                "VERSION_RELEASED",
                {
                    "workspace_id": str(workspace_id),
                    "version_id": str(version.id),
                    "review_round_id": str(review_round.id),
                    "version_number": version.number,
                },
            )
            self.versions.add_idempotent_result(
                actor_id=actor.id,
                workspace_id=workspace_id,
                operation=RELEASE_OPERATION,
                idempotency_key=normalized_key,
                request_fingerprint=RELEASE_FINGERPRINT,
                response_payload={
                    "version_id": str(version.id),
                    "review_round_id": str(review_round.id),
                    "review_round_status": review_round.status.value,
                    "review_round_opened_at": review_round.opened_at.isoformat(),
                    "review_round_closed_at": None,
                    "review_round_decided_by": None,
                    "review_round_decision_note": None,
                    "workspace_revision": next_revision,
                },
            )
            self.unit_of_work.commit()
        except Exception:
            self.unit_of_work.rollback()
            raise

        return (
            VersionWithStatus(version, VersionDisplayStatus.IN_REVIEW),
            review_round,
            next_revision,
        )


class ListVersions:
    def __init__(self, versions: VersionRepository) -> None:
        self.versions = versions

    def execute(
        self, viewer: WorkspaceViewer, workspace_id: UUID
    ) -> list[VersionWithStatus]:
        workspace = _authorize_viewer(viewer, self.versions, workspace_id)
        return [
            VersionWithStatus(version, _display_status(version, workspace, self.versions))
            for version in self.versions.list_versions(workspace_id)
        ]


class GetVersion:
    def __init__(self, versions: VersionRepository) -> None:
        self.versions = versions

    def execute(
        self, viewer: WorkspaceViewer, workspace_id: UUID, version_id: UUID
    ) -> VersionWithStatus:
        workspace = _authorize_viewer(viewer, self.versions, workspace_id)
        version = self.versions.get_version(workspace_id, version_id)
        if version is None:
            raise ResourceNotFound("Version was not found")
        return VersionWithStatus(version, _display_status(version, workspace, self.versions))


class GetVersionDiff:
    def __init__(self, versions: VersionRepository) -> None:
        self.versions = versions

    def execute(
        self, viewer: WorkspaceViewer, workspace_id: UUID, version_id: UUID
    ) -> StructuredDiff:
        _authorize_viewer(viewer, self.versions, workspace_id)
        target = self.versions.get_version(workspace_id, version_id)
        if target is None:
            raise ResourceNotFound("Version was not found")
        base = (
            self.versions.get_version(workspace_id, target.previous_version_id)
            if target.previous_version_id is not None
            else None
        )
        if target.previous_version_id is not None and base is None:
            raise ResourceNotFound("Previous version was not found")
        return _structured_diff(base, target)


class GetReviewRound:
    def __init__(self, versions: VersionRepository) -> None:
        self.versions = versions

    def execute(
        self, viewer: WorkspaceViewer, workspace_id: UUID, review_round_id: UUID
    ) -> ReviewRound:
        _authorize_viewer(viewer, self.versions, workspace_id)
        review_round = self.versions.get_review_round(workspace_id, review_round_id)
        if review_round is None:
            raise ResourceNotFound("Review round was not found")
        return review_round


def _authorize_designer(
    actor: CurrentActor,
    versions: VersionRepository,
    workspace_id: UUID,
    *,
    edit: bool,
) -> None:
    if actor.system_role != SystemRole.DESIGNER:
        raise PermissionDenied("Only designers can perform this workspace action")
    grant = versions.get_active_grant(workspace_id, actor.id)
    if grant is None:
        raise ResourceNotFound("Workspace was not found")
    allowed = grant.can_edit if edit else grant.can_view
    if not allowed:
        raise PermissionDenied("You do not have permission for this workspace action")


def _authorize_viewer(
    viewer: WorkspaceViewer,
    versions: VersionRepository,
    workspace_id: UUID,
) -> WorkspaceSummary:
    if isinstance(viewer, CurrentActor):
        _authorize_designer(viewer, versions, workspace_id, edit=False)
    elif viewer.workspace_id != workspace_id:
        raise ResourceNotFound("Workspace was not found")
    workspace = versions.get_workspace(workspace_id)
    if workspace is None or workspace.record_status == "CANCELLED":
        raise ResourceNotFound("Workspace was not found")
    return workspace


def _build_snapshot(
    versions: VersionRepository,
    workspace_id: UUID,
    blocks: list[SpecificationBlock],
) -> list[dict[str, Any]]:
    snapshot: list[dict[str, Any]] = []
    for block in sorted(blocks, key=lambda item: (item.position, str(item.id))):
        if not block.label.strip() or len(block.label.strip()) > 200:
            raise ValidationFailed("Every block must have a valid label")
        if block.position < 0 or block.schema_version < 1:
            raise ValidationFailed("Every block must have a valid position and schema version")
        asset_ids = validate_block_content(block.block_type, block.content)
        assets: list[dict[str, Any]] = []
        for asset_id in sorted(asset_ids, key=str):
            asset = versions.get_asset(workspace_id, asset_id)
            if asset is None or asset.status != AssetStatus.READY:
                raise ValidationFailed("Every referenced asset must be READY in this workspace")
            assets.append(
                {
                    "asset_id": str(asset.id),
                    "original_filename": asset.original_filename,
                    "checksum": asset.checksum,
                }
            )
        item: dict[str, Any] = {
            "id": str(block.id),
            "block_type": block.block_type.value,
            "label": block.label,
            "content": _json_value(deepcopy(block.content)),
            "position": block.position,
            "schema_version": block.schema_version,
        }
        if assets:
            item["assets"] = assets
        snapshot.append(item)
    return snapshot


def _json_value(value: Any) -> Any:
    if isinstance(value, UUID):
        return str(value)
    if isinstance(value, Enum):
        return value.value
    if isinstance(value, dict):
        return {str(key): _json_value(item) for key, item in value.items()}
    if isinstance(value, list):
        return [_json_value(item) for item in value]
    return value


def _content_hash(snapshot: list[dict[str, Any]]) -> str:
    canonical = json.dumps(
        snapshot,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    ).encode("utf-8")
    return hashlib.sha256(canonical).hexdigest()


def _display_status(
    version: SpecificationVersion,
    workspace: WorkspaceSummary,
    versions: VersionRepository,
) -> VersionDisplayStatus:
    if workspace.production_version_id == version.id:
        return VersionDisplayStatus.LOCKED_FOR_PRODUCTION
    if workspace.approved_version_id == version.id:
        return VersionDisplayStatus.APPROVED
    review_round = versions.get_review_round_for_version(workspace.id, version.id)
    if review_round is not None and review_round.status == ReviewRoundStatus.OPEN:
        return VersionDisplayStatus.IN_REVIEW
    return VersionDisplayStatus.HISTORICAL


def _structured_diff(
    base: SpecificationVersion | None,
    target: SpecificationVersion,
) -> StructuredDiff:
    base_snapshot = base.snapshot if base is not None else []
    base_blocks = {str(item["id"]): item for item in base_snapshot}
    target_blocks = {str(item["id"]): item for item in target.snapshot}
    shared_ids = sorted(base_blocks.keys() & target_blocks.keys())
    changed: list[FieldChange] = []
    reordered: list[BlockReorder] = []

    for block_id_text in shared_ids:
        before = base_blocks[block_id_text]
        after = target_blocks[block_id_text]
        block_id = UUID(block_id_text)
        before_position = int(before["position"])
        after_position = int(after["position"])
        if before_position != after_position:
            reordered.append(BlockReorder(block_id, before_position, after_position))
        _walk_changes(
            block_id,
            {key: value for key, value in before.items() if key not in {"id", "position"}},
            {key: value for key, value in after.items() if key not in {"id", "position"}},
            "",
            changed,
        )

    return StructuredDiff(
        base_version_id=base.id if base is not None else None,
        target_version_id=target.id,
        added=[item for item in target.snapshot if str(item["id"]) not in base_blocks],
        removed=[item for item in base_snapshot if str(item["id"]) not in target_blocks],
        changed=changed,
        reordered=reordered,
    )


def _walk_changes(
    block_id: UUID,
    before: Any,
    after: Any,
    path: str,
    changes: list[FieldChange],
) -> None:
    if isinstance(before, dict) and isinstance(after, dict):
        for key in sorted(before.keys() | after.keys()):
            child_path = f"{path}.{key}" if path else key
            if key not in before or key not in after:
                changes.append(
                    FieldChange(block_id, child_path, before.get(key), after.get(key))
                )
            else:
                _walk_changes(block_id, before[key], after[key], child_path, changes)
        return
    if isinstance(before, list) and isinstance(after, list) and len(before) == len(after):
        for index, (before_item, after_item) in enumerate(zip(before, after, strict=True)):
            child_path = f"{path}.{index}" if path else str(index)
            _walk_changes(block_id, before_item, after_item, child_path, changes)
        return
    if before != after:
        changes.append(FieldChange(block_id, path, before, after))
