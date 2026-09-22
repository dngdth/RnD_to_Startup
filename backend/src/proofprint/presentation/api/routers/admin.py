from uuid import UUID

from fastapi import APIRouter, status

from proofprint.presentation.api.dependencies import (
    CreateDesignerDep,
    CurrentActorDep,
    ListDesignersDep,
    SetDesignerStatusDep,
)
from proofprint.presentation.schemas.admin import (
    CreateDesignerRequest,
    DesignerAccountResponse,
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
