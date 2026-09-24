from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Response, status

from proofprint.presentation.api.dependencies import (
    ApproveVersionDep,
    CurrentActorDep,
    CurrentGuestDep,
    GetProductionSnapshotDep,
    IdempotencyKeyDep,
    IfMatchDep,
    LockProductionDep,
    WorkspaceViewerDep,
)
from proofprint.presentation.schemas.approval_production import (
    ApprovalMutationResponse,
    ApprovalResponse,
    ProductionSnapshotResponse,
)

router = APIRouter(tags=["approvals and production"])


@router.post(
    "/workspaces/{workspace_id}/versions/{version_id}/approvals",
    response_model=ApprovalMutationResponse,
    status_code=status.HTTP_201_CREATED,
)
def approve_version(
    workspace_id: UUID,
    version_id: UUID,
    response: Response,
    expected_revision: IfMatchDep,
    idempotency_key: IdempotencyKeyDep,
    guest: CurrentGuestDep,
    use_case: ApproveVersionDep,
) -> ApprovalMutationResponse:
    approval, revision = use_case.execute(
        guest=guest,
        workspace_id=workspace_id,
        version_id=version_id,
        expected_revision=expected_revision,
        idempotency_key=idempotency_key,
    )
    response.headers["ETag"] = f'W/"{revision}"'
    return ApprovalMutationResponse(
        approval=ApprovalResponse.from_domain(approval), workspace_revision=revision
    )


@router.post(
    "/workspaces/{workspace_id}/versions/{version_id}/production-lock",
    response_model=ProductionSnapshotResponse,
)
def lock_production(
    workspace_id: UUID,
    version_id: UUID,
    response: Response,
    expected_revision: IfMatchDep,
    idempotency_key: IdempotencyKeyDep,
    actor: CurrentActorDep,
    use_case: LockProductionDep,
) -> ProductionSnapshotResponse:
    snapshot, revision = use_case.execute(
        actor=actor,
        workspace_id=workspace_id,
        version_id=version_id,
        expected_revision=expected_revision,
        idempotency_key=idempotency_key,
    )
    response.headers["ETag"] = f'W/"{revision}"'
    return ProductionSnapshotResponse.from_domain(snapshot)


@router.get(
    "/workspaces/{workspace_id}/production-snapshot",
    response_model=ProductionSnapshotResponse,
)
def get_production_snapshot_route(
    workspace_id: UUID,
    viewer: WorkspaceViewerDep,
    use_case: GetProductionSnapshotDep,
) -> ProductionSnapshotResponse:
    snapshot = use_case.execute(viewer, workspace_id)
    return ProductionSnapshotResponse.from_domain(snapshot)
