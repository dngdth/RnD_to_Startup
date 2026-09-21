from uuid import UUID

from fastapi import APIRouter, HTTPException, status

from proofprint.domain.exceptions import Conflict, ResourceNotFound

from proofprint.presentation.api.dependencies import CurrentActorDep, ManageDesignersDep
from proofprint.presentation.schemas.admin import (
    CreateDesignerRequest,
    DesignerAccountResponse,
    UpdateDesignerStatusRequest,
    UpdateDesignerRequest,
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


@router.get("/{designer_id}", response_model=DesignerAccountResponse)
def get_designer_detail(
    designer_id: UUID,
    actor: CurrentActorDep,
    manager: ManageDesignersDep,
) -> DesignerAccountResponse:
    """Xem chi tiết một tài khoản Designer theo ID."""
    # Gọi hàm tìm kiếm chi tiết từ Manager layer (Use Case)
    designer = manager.find(actor, designer_id) # Hoặc manager.get_by_id(actor, designer_id) tùy theo code của nhóm
    if not designer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Designer not found"
        )
    return DesignerAccountResponse.from_domain(designer)


@router.patch("/{designer_id}", response_model=DesignerAccountResponse)
def update_designer_profile(
    designer_id: UUID,
    payload: UpdateDesignerRequest,
    actor: CurrentActorDep,
    manager: ManageDesignersDep,
) -> DesignerAccountResponse:
    """Sửa hồ sơ Designer (Cập nhật tên hiển thị, email...)."""
    try:
        designer = manager.update(
            actor,
            designer_id,
            display_name=payload.display_name,
            email=payload.email,
        )
    except ResourceNotFound as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except Conflict as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e),
        )
    return DesignerAccountResponse.from_domain(designer)