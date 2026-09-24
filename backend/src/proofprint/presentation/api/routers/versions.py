from uuid import UUID

from fastapi import APIRouter, Response, status

from proofprint.presentation.api.dependencies import (
    CurrentActorDep,
    GetReviewRoundDep,
    GetVersionDep,
    GetVersionDiffDep,
    IdempotencyKeyDep,
    IfMatchDep,
    ListVersionsDep,
    ReleaseVersionDep,
    WorkspaceViewerDep,
)
from proofprint.presentation.schemas.versions import (
    ReleasedVersionResponse,
    ReleaseVersionRequest,
    ReviewRoundResponse,
    StructuredDiffResponse,
    VersionResponse,
    VersionSummaryResponse,
)

router = APIRouter(prefix="/workspaces", tags=["versions and review"])


def revision_etag(revision: int) -> str:
    return f'W/"{revision}"'


@router.post(
    "/{workspace_id}/versions",
    response_model=ReleasedVersionResponse,
    status_code=status.HTTP_201_CREATED,
)
def release_version(
    workspace_id: UUID,
    response: Response,
    expected_revision: IfMatchDep,
    idempotency_key: IdempotencyKeyDep,
    actor: CurrentActorDep,
    use_case: ReleaseVersionDep,
    payload: ReleaseVersionRequest | None = None,
) -> ReleasedVersionResponse:
    version, review_round, revision = use_case.execute(
        actor=actor,
        workspace_id=workspace_id,
        expected_revision=expected_revision,
        idempotency_key=idempotency_key,
        resolved_request_block_ids=payload.resolved_request_block_ids if payload else None,
    )
    response.headers["ETag"] = revision_etag(revision)
    return ReleasedVersionResponse(
        version=VersionResponse.from_domain(version),
        review_round=ReviewRoundResponse.from_domain(review_round),
        workspace_revision=revision,
    )


@router.get("/{workspace_id}/versions", response_model=list[VersionSummaryResponse])
def list_versions(
    workspace_id: UUID,
    viewer: WorkspaceViewerDep,
    use_case: ListVersionsDep,
) -> list[VersionSummaryResponse]:
    return [
        VersionSummaryResponse.from_domain(item)
        for item in use_case.execute(viewer, workspace_id)
    ]


@router.get("/{workspace_id}/versions/{version_id}", response_model=VersionResponse)
def get_version(
    workspace_id: UUID,
    version_id: UUID,
    viewer: WorkspaceViewerDep,
    use_case: GetVersionDep,
) -> VersionResponse:
    return VersionResponse.from_domain(use_case.execute(viewer, workspace_id, version_id))


@router.get(
    "/{workspace_id}/versions/{version_id}/diff",
    response_model=StructuredDiffResponse,
)
def get_version_diff(
    workspace_id: UUID,
    version_id: UUID,
    viewer: WorkspaceViewerDep,
    use_case: GetVersionDiffDep,
) -> StructuredDiffResponse:
    return StructuredDiffResponse.from_domain(
        use_case.execute(viewer, workspace_id, version_id)
    )


@router.get(
    "/{workspace_id}/review-rounds/{review_round_id}",
    response_model=ReviewRoundResponse,
)
def get_review_round(
    workspace_id: UUID,
    review_round_id: UUID,
    viewer: WorkspaceViewerDep,
    use_case: GetReviewRoundDep,
) -> ReviewRoundResponse:
    return ReviewRoundResponse.from_domain(
        use_case.execute(viewer, workspace_id, review_round_id)
    )
