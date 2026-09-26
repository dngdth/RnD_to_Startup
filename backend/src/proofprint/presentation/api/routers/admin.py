from uuid import UUID

from fastapi import APIRouter, HTTPException, status

from proofprint.domain.exceptions import Conflict, ResourceNotFound
from proofprint.presentation.api.dependencies import (
    CreateDesignerDep,
    CurrentActorDep,
    ListDesignersDep,
    ManageDesignersDep,
    SetDesignerStatusDep,
)
from proofprint.presentation.schemas.admin import (
    CreateDesignerRequest,
    DesignerAccountResponse,
    UpdateDesignerRequest,
    UpdateDesignerStatusRequest,
)

router = APIRouter(prefix="/admin/designers", tags=["admin designers"])


@router.get("", response_model=list[DesignerAccountResponse])
def list_designers(
    actor: CurrentActorDep,
    use_case: ListDesignersDep,
) -> list[DesignerAccountResponse]:
    return [DesignerAccountResponse.from_domain(item) for item in use_case.execute(actor)]


@router.post("", response_model=DesignerAccountResponse, status_code=status.HTTP_201_CREATED)
def create_designer(
    payload: CreateDesignerRequest,
    actor: CurrentActorDep,
    use_case: CreateDesignerDep,
) -> DesignerAccountResponse:
    account = use_case.execute(
        actor,
        email=payload.email,
        display_name=payload.display_name,
        temporary_password=payload.temporary_password,
        phone=payload.phone,
    )
    return DesignerAccountResponse.from_domain(account)


@router.patch("/{designer_id}/status", response_model=DesignerAccountResponse)
def update_designer_status(
    designer_id: UUID,
    payload: UpdateDesignerStatusRequest,
    actor: CurrentActorDep,
    use_case: SetDesignerStatusDep,
) -> DesignerAccountResponse:
    return DesignerAccountResponse.from_domain(
        use_case.execute(actor, designer_id, payload.status)
    )


@router.get("/{designer_id}", response_model=DesignerAccountResponse)
def get_designer_detail(
    designer_id: UUID,
    actor: CurrentActorDep,
    use_case: ListDesignersDep,
) -> DesignerAccountResponse:
    """Xem chi tiết một tài khoản Designer theo ID."""
    designers = use_case.execute(actor)
    designer = next((d for d in designers if d.id == designer_id), None)
    if not designer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Designer not found",
        )
    return DesignerAccountResponse.from_domain(designer)


@router.patch("/{designer_id}", response_model=DesignerAccountResponse)
def update_designer_profile(
    designer_id: UUID,
    payload: UpdateDesignerRequest,
    actor: CurrentActorDep,
    use_case: SetDesignerStatusDep,
) -> DesignerAccountResponse:
    """Sửa hồ sơ Designer (Cập nhật tên hiển thị, email...)."""
    try:
        designer = use_case.update(
            actor,
            designer_id,
            display_name=payload.display_name,
            email=payload.email,
            phone=payload.phone,
        )
    except ResourceNotFound:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Designer not found",
        )
    except Conflict as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e),
        )
    return DesignerAccountResponse.from_domain(designer)
