from uuid import UUID

from fastapi import APIRouter, status

from proofprint.presentation.api.dependencies import CurrentActorDep, ManageDesignersDep
from proofprint.presentation.schemas.admin import (
    CreateDesignerRequest,
    DesignerAccountResponse,
    UpdateDesignerStatusRequest,
)

router = APIRouter(prefix="/admin/designers", tags=["admin designers"])


@router.get("", response_model=list[DesignerAccountResponse])
def list_designers(
    actor: CurrentActorDep,
    manager: ManageDesignersDep,
) -> list[DesignerAccountResponse]:
    return [DesignerAccountResponse.from_domain(item) for item in manager.list(actor)]


@router.post("", response_model=DesignerAccountResponse, status_code=status.HTTP_201_CREATED)
def create_designer(
    payload: CreateDesignerRequest,
    actor: CurrentActorDep,
    manager: ManageDesignersDep,
) -> DesignerAccountResponse:
    account = manager.create(
        actor,
        email=payload.email,
        display_name=payload.display_name,
        temporary_password=payload.temporary_password,
    )
    return DesignerAccountResponse.from_domain(account)


@router.patch("/{designer_id}/status", response_model=DesignerAccountResponse)
def update_designer_status(
    designer_id: UUID,
    payload: UpdateDesignerStatusRequest,
    actor: CurrentActorDep,
    manager: ManageDesignersDep,
) -> DesignerAccountResponse:
    return DesignerAccountResponse.from_domain(
        manager.set_status(actor, designer_id, payload.status)
    )
