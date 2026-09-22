from uuid import UUID

from fastapi import APIRouter, Response, status

from proofprint.presentation.api.dependencies import (
    CreateWorkspaceDep,
    CurrentActorDep,
    DisableReviewLinkDep,
    GetReviewLinkDep,
    GetWorkspaceDep,
    IdempotencyKeyDep,
    IfMatchDep,
    ListWorkspacesDep,
    RotateReviewLinkDep,
)
from proofprint.presentation.schemas.workspaces import (
    CreateWorkspaceRequest,
    ReviewLinkCommandRequest,
    ReviewLinkResponse,
    WorkspaceCreatedResponse,
    WorkspaceResponse,
)

router = APIRouter(prefix="/workspaces", tags=["workspaces"])


@router.post("", response_model=WorkspaceCreatedResponse, status_code=status.HTTP_201_CREATED)
def create_workspace(
    payload: CreateWorkspaceRequest,
    response: Response,
    idempotency_key: IdempotencyKeyDep,
    actor: CurrentActorDep,
    use_case: CreateWorkspaceDep,
) -> WorkspaceCreatedResponse:
    created = use_case.execute(
        actor=actor,
        customer_name=payload.customer.name,
        customer_email=payload.customer.email,
        customer_phone=payload.customer.phone,
        product_type=payload.product_type,
        idempotency_key=idempotency_key,
    )
    link = created.review_link
    response.headers["ETag"] = f'W/"{created.workspace.revision}"'
    return WorkspaceCreatedResponse(
        workspace=WorkspaceResponse.from_domain(created.workspace),
        review_link=ReviewLinkResponse(
            id=link.link.id,
            workspace_id=link.link.workspace_id,
            version=link.link.version,
            status=link.link.status.value,
            review_url=link.review_url,
            created_at=link.link.created_at,
        ),
    )


@router.get("", response_model=list[WorkspaceResponse])
def list_workspaces(
    actor: CurrentActorDep, use_case: ListWorkspacesDep
) -> list[WorkspaceResponse]:
    return [WorkspaceResponse.from_domain(item) for item in use_case.execute(actor)]


@router.get("/{workspace_id}", response_model=WorkspaceResponse)
def get_workspace(
    workspace_id: UUID,
    response: Response,
    actor: CurrentActorDep,
    use_case: GetWorkspaceDep,
) -> WorkspaceResponse:
    workspace, grant = use_case.execute(actor, workspace_id)
    response.headers["ETag"] = f'W/"{workspace.revision}"'
    return WorkspaceResponse.from_domain(workspace, grant)


@router.get("/{workspace_id}/review-link", response_model=ReviewLinkResponse)
def get_review_link(
    workspace_id: UUID,
    actor: CurrentActorDep,
    use_case: GetReviewLinkDep,
) -> ReviewLinkResponse:
    view = use_case.execute(actor, workspace_id)
    return ReviewLinkResponse(
        id=view.link.id,
        workspace_id=view.link.workspace_id,
        version=view.link.version,
        status=view.link.status.value,
        review_url=view.review_url,
        created_at=view.link.created_at,
    )


@router.post("/{workspace_id}/review-link/disable", status_code=status.HTTP_204_NO_CONTENT)
def disable_review_link(
    workspace_id: UUID,
    payload: ReviewLinkCommandRequest,
    actor: CurrentActorDep,
    expected_revision: IfMatchDep,
    use_case: DisableReviewLinkDep,
) -> Response:
    revision = use_case.execute(actor, workspace_id, payload.reason, expected_revision)
    return Response(
        status_code=status.HTTP_204_NO_CONTENT,
        headers={"ETag": f'W/"{revision}"'},
    )


@router.post("/{workspace_id}/review-link/rotate", response_model=ReviewLinkResponse)
def rotate_review_link(
    workspace_id: UUID,
    payload: ReviewLinkCommandRequest,
    response: Response,
    actor: CurrentActorDep,
    expected_revision: IfMatchDep,
    use_case: RotateReviewLinkDep,
) -> ReviewLinkResponse:
    view, revision = use_case.execute(actor, workspace_id, payload.reason, expected_revision)
    response.headers["ETag"] = f'W/"{revision}"'
    return ReviewLinkResponse(
        id=view.link.id,
        workspace_id=view.link.workspace_id,
        version=view.link.version,
        status=view.link.status.value,
        review_url=view.review_url,
        created_at=view.link.created_at,
    )
