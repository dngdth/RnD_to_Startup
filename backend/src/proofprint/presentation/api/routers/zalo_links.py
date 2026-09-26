from uuid import UUID

from fastapi import APIRouter, Response, status

from proofprint.presentation.api.dependencies import (
    CurrentActorDep,
    GetCustomerZaloStatusDep,
    GetDesignerZaloStatusDep,
    IssueCustomerZaloLinkCodeDep,
    IssueDesignerZaloLinkCodeDep,
    RevokeCustomerZaloLinkDep,
    RevokeDesignerZaloLinkDep,
)
from proofprint.presentation.schemas.zalo import (
    ZaloLinkCodeResponse,
    ZaloLinkStatusResponse,
)

router = APIRouter(tags=["Zalo linking"])


@router.get("/zalo/me", response_model=ZaloLinkStatusResponse)
def get_my_zalo_status(
    actor: CurrentActorDep,
    use_case: GetDesignerZaloStatusDep,
) -> ZaloLinkStatusResponse:
    return ZaloLinkStatusResponse.from_domain(use_case.execute(actor))


@router.post("/zalo/me/link-code", response_model=ZaloLinkCodeResponse)
def issue_my_zalo_link_code(
    actor: CurrentActorDep,
    use_case: IssueDesignerZaloLinkCodeDep,
) -> ZaloLinkCodeResponse:
    return ZaloLinkCodeResponse.from_domain(use_case.execute(actor))


@router.delete("/zalo/me", status_code=status.HTTP_204_NO_CONTENT)
def revoke_my_zalo_link(
    actor: CurrentActorDep,
    use_case: RevokeDesignerZaloLinkDep,
) -> Response:
    use_case.execute(actor)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get(
    "/workspaces/{workspace_id}/customer-zalo",
    response_model=ZaloLinkStatusResponse,
)
def get_customer_zalo_status(
    workspace_id: UUID,
    actor: CurrentActorDep,
    use_case: GetCustomerZaloStatusDep,
) -> ZaloLinkStatusResponse:
    return ZaloLinkStatusResponse.from_domain(use_case.execute(actor, workspace_id))


@router.post(
    "/workspaces/{workspace_id}/customer-zalo/link-code",
    response_model=ZaloLinkCodeResponse,
)
def issue_customer_zalo_link_code(
    workspace_id: UUID,
    actor: CurrentActorDep,
    use_case: IssueCustomerZaloLinkCodeDep,
) -> ZaloLinkCodeResponse:
    return ZaloLinkCodeResponse.from_domain(use_case.execute(actor, workspace_id))


@router.delete(
    "/workspaces/{workspace_id}/customer-zalo",
    status_code=status.HTTP_204_NO_CONTENT,
)
def revoke_customer_zalo_link(
    workspace_id: UUID,
    actor: CurrentActorDep,
    use_case: RevokeCustomerZaloLinkDep,
) -> Response:
    use_case.execute(actor, workspace_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)

