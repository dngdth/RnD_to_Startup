from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from proofprint.application.use_cases.manage_approvals import (
    ApproveVersion,
    GetProductionSnapshot,
    LockProduction,
)
from proofprint.infrastructure.database import get_session
from proofprint.infrastructure.repositories.approval_production import (
    SqlAlchemyApprovalProductionRepository,
)
from proofprint.infrastructure.unit_of_work import SqlAlchemyUnitOfWork
from proofprint.presentation.api.dependencies import (
    CurrentActorDep,
    CurrentGuestDep,
    IdempotencyKeyDep,
    IfMatchDep,
    WorkspaceViewerDep,
)
from proofprint.presentation.schemas.approval_production import (
    ApprovalMutationResponse,
    ApprovalResponse,
    ProductionSnapshotResponse,
)

router = APIRouter(tags=["approvals and production"])


def get_approve_version(session: Annotated[Session, Depends(get_session)]) -> ApproveVersion:
    return ApproveVersion(
        SqlAlchemyApprovalProductionRepository(session), SqlAlchemyUnitOfWork(session)
    )


def get_lock_production(session: Annotated[Session, Depends(get_session)]) -> LockProduction:
    return LockProduction(
        SqlAlchemyApprovalProductionRepository(session), SqlAlchemyUnitOfWork(session)
    )


def get_production_snapshot(
    session: Annotated[Session, Depends(get_session)],
) -> GetProductionSnapshot:
    return GetProductionSnapshot(SqlAlchemyApprovalProductionRepository(session))


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
    use_case: Annotated[ApproveVersion, Depends(get_approve_version)],
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
    use_case: Annotated[LockProduction, Depends(get_lock_production)],
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
    use_case: Annotated[GetProductionSnapshot, Depends(get_production_snapshot)],
) -> ProductionSnapshotResponse:
    snapshot = use_case.execute(viewer, workspace_id)
    return ProductionSnapshotResponse.from_domain(snapshot)
