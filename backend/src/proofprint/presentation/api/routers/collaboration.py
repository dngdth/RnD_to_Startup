from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Query, Response, status

from proofprint.domain.entities.collaboration import ChangeRequest
from proofprint.presentation.api.dependencies import (
    AcknowledgeChangeRequestDep,
    CancelChangeRequestDep,
    ConfirmChangeRequestDep,
    CreateChangeRequestDep,
    CreateCommentDep,
    CurrentActorDep,
    CurrentGuestDep,
    GetChangeRequestDep,
    IdempotencyKeyDep,
    IfMatchDep,
    ListChangeRequestsDep,
    ListCommentsDep,
    MarkChangeRequestUpdatedDep,
    RejectChangeRequestDep,
    ReopenChangeRequestDep,
    RequestChangesDep,
    WorkspaceViewerDep,
)
from proofprint.presentation.schemas.collaboration import (
    ChangeRequestMutationResponse,
    ChangeRequestResponse,
    CommentCreatedResponse,
    CommentResponse,
    CreateChangeRequestRequest,
    CreateCommentRequest,
    MarkUpdatedRequest,
    RejectChangeRequestRequest,
    ReopenChangeRequestRequest,
    ReopenedChangeRequestResponse,
    RequestChangesRequest,
    ReviewChangesRequestedResponse,
)
from proofprint.presentation.schemas.versions import ReviewRoundResponse

router = APIRouter(tags=["comments and change requests"])


def revision_etag(revision: int) -> str:
    return f'W/"{revision}"'


@router.post(
    "/workspaces/{workspace_id}/comments",
    response_model=CommentCreatedResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_comment(
    workspace_id: UUID,
    payload: CreateCommentRequest,
    response: Response,
    expected_revision: IfMatchDep,
    author: WorkspaceViewerDep,
    use_case: CreateCommentDep,
) -> CommentCreatedResponse:
    comment, revision = use_case.execute(
        author=author,
        workspace_id=workspace_id,
        body=payload.body,
        version_id=payload.version_id,
        block_id=payload.block_id,
        change_request_id=payload.change_request_id,
        expected_revision=expected_revision,
    )
    response.headers["ETag"] = revision_etag(revision)
    return CommentCreatedResponse(
        comment=CommentResponse.from_domain(comment), workspace_revision=revision
    )


@router.get(
    "/workspaces/{workspace_id}/comments",
    response_model=list[CommentResponse],
)
def list_comments(
    workspace_id: UUID,
    viewer: WorkspaceViewerDep,
    use_case: ListCommentsDep,
    version_id: Annotated[UUID | None, Query()] = None,
    block_id: Annotated[UUID | None, Query()] = None,
    change_request_id: Annotated[UUID | None, Query()] = None,
) -> list[CommentResponse]:
    return [
        CommentResponse.from_domain(item)
        for item in use_case.execute(
            viewer,
            workspace_id,
            version_id=version_id,
            block_id=block_id,
            change_request_id=change_request_id,
        )
    ]


@router.post(
    "/workspaces/{workspace_id}/versions/{version_id}/change-requests",
    response_model=ChangeRequestMutationResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_change_request(
    workspace_id: UUID,
    version_id: UUID,
    payload: CreateChangeRequestRequest,
    response: Response,
    expected_revision: IfMatchDep,
    idempotency_key: IdempotencyKeyDep,
    guest: CurrentGuestDep,
    use_case: CreateChangeRequestDep,
) -> ChangeRequestMutationResponse:
    change_request, revision = use_case.execute(
        guest=guest,
        workspace_id=workspace_id,
        version_id=version_id,
        block_id=payload.block_id,
        field_path=payload.field_path,
        message=payload.message,
        expected_revision=expected_revision,
        idempotency_key=idempotency_key,
    )
    response.headers["ETag"] = revision_etag(revision)
    return ChangeRequestMutationResponse(
        change_request=ChangeRequestResponse.from_domain(change_request),
        workspace_revision=revision,
    )


@router.get(
    "/workspaces/{workspace_id}/change-requests",
    response_model=list[ChangeRequestResponse],
)
def list_change_requests(
    workspace_id: UUID,
    viewer: WorkspaceViewerDep,
    use_case: ListChangeRequestsDep,
) -> list[ChangeRequestResponse]:
    return [
        ChangeRequestResponse.from_domain(item)
        for item in use_case.execute(viewer, workspace_id)
    ]


@router.get(
    "/change-requests/{change_request_id}", response_model=ChangeRequestResponse
)
def get_change_request(
    change_request_id: UUID,
    viewer: WorkspaceViewerDep,
    use_case: GetChangeRequestDep,
) -> ChangeRequestResponse:
    return ChangeRequestResponse.from_domain(
        use_case.execute(viewer, change_request_id)
    )


@router.post(
    "/change-requests/{change_request_id}/acknowledge",
    response_model=ChangeRequestMutationResponse,
)
def acknowledge_change_request(
    change_request_id: UUID,
    response: Response,
    expected_revision: IfMatchDep,
    actor: CurrentActorDep,
    use_case: AcknowledgeChangeRequestDep,
) -> ChangeRequestMutationResponse:
    change_request, revision = use_case.execute(
        actor=actor,
        change_request_id=change_request_id,
        expected_revision=expected_revision,
    )
    return _change_response(response, change_request, revision)


@router.post(
    "/change-requests/{change_request_id}/mark-updated",
    response_model=ChangeRequestMutationResponse,
)
def mark_change_request_updated(
    change_request_id: UUID,
    payload: MarkUpdatedRequest,
    response: Response,
    expected_revision: IfMatchDep,
    actor: CurrentActorDep,
    use_case: MarkChangeRequestUpdatedDep,
) -> ChangeRequestMutationResponse:
    change_request, revision = use_case.execute(
        actor=actor,
        change_request_id=change_request_id,
        resolved_in_version_id=payload.resolved_in_version_id,
        expected_revision=expected_revision,
    )
    return _change_response(response, change_request, revision)


@router.post(
    "/change-requests/{change_request_id}/confirm",
    response_model=ChangeRequestMutationResponse,
)
def confirm_change_request(
    change_request_id: UUID,
    response: Response,
    expected_revision: IfMatchDep,
    guest: CurrentGuestDep,
    use_case: ConfirmChangeRequestDep,
) -> ChangeRequestMutationResponse:
    change_request, revision = use_case.execute(
        guest=guest,
        change_request_id=change_request_id,
        expected_revision=expected_revision,
    )
    return _change_response(response, change_request, revision)


@router.post(
    "/change-requests/{change_request_id}/reopen",
    response_model=ReopenedChangeRequestResponse,
    status_code=status.HTTP_201_CREATED,
)
def reopen_change_request(
    change_request_id: UUID,
    payload: ReopenChangeRequestRequest,
    response: Response,
    expected_revision: IfMatchDep,
    guest: CurrentGuestDep,
    use_case: ReopenChangeRequestDep,
) -> ReopenedChangeRequestResponse:
    reopened, child, revision = use_case.execute(
        guest=guest,
        change_request_id=change_request_id,
        message=payload.message,
        expected_revision=expected_revision,
    )
    response.headers["ETag"] = revision_etag(revision)
    return ReopenedChangeRequestResponse(
        reopened_change_request=ChangeRequestResponse.from_domain(reopened),
        new_change_request=ChangeRequestResponse.from_domain(child),
        workspace_revision=revision,
    )


@router.post(
    "/change-requests/{change_request_id}/reject",
    response_model=ChangeRequestMutationResponse,
)
def reject_change_request(
    change_request_id: UUID,
    payload: RejectChangeRequestRequest,
    response: Response,
    expected_revision: IfMatchDep,
    actor: CurrentActorDep,
    use_case: RejectChangeRequestDep,
) -> ChangeRequestMutationResponse:
    change_request, revision = use_case.execute(
        actor=actor,
        change_request_id=change_request_id,
        resolution_note=payload.resolution_note,
        expected_revision=expected_revision,
    )
    return _change_response(response, change_request, revision)


@router.post(
    "/change-requests/{change_request_id}/cancel",
    response_model=ChangeRequestMutationResponse,
)
def cancel_change_request(
    change_request_id: UUID,
    response: Response,
    expected_revision: IfMatchDep,
    guest: CurrentGuestDep,
    use_case: CancelChangeRequestDep,
) -> ChangeRequestMutationResponse:
    change_request, revision = use_case.execute(
        guest=guest,
        change_request_id=change_request_id,
        expected_revision=expected_revision,
    )
    return _change_response(response, change_request, revision)


@router.post(
    "/workspaces/{workspace_id}/versions/{version_id}/request-changes",
    response_model=ReviewChangesRequestedResponse,
)
def request_changes(
    workspace_id: UUID,
    version_id: UUID,
    payload: RequestChangesRequest,
    response: Response,
    expected_revision: IfMatchDep,
    idempotency_key: IdempotencyKeyDep,
    guest: CurrentGuestDep,
    use_case: RequestChangesDep,
) -> ReviewChangesRequestedResponse:
    review_round, revision = use_case.execute(
        guest=guest,
        workspace_id=workspace_id,
        version_id=version_id,
        decision_note=payload.decision_note,
        expected_revision=expected_revision,
        idempotency_key=idempotency_key,
    )
    response.headers["ETag"] = revision_etag(revision)
    return ReviewChangesRequestedResponse(
        review_round=ReviewRoundResponse.from_domain(review_round),
        workspace_revision=revision,
    )


def _change_response(
    response: Response, change_request: ChangeRequest, revision: int
) -> ChangeRequestMutationResponse:
    response.headers["ETag"] = revision_etag(revision)
    return ChangeRequestMutationResponse(
        change_request=ChangeRequestResponse.from_domain(change_request),
        workspace_revision=revision,
    )
