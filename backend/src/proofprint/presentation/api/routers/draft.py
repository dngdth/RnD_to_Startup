from uuid import UUID

from fastapi import APIRouter, Response, status

from proofprint.presentation.api.dependencies import (
    CurrentActorDep,
    DeleteDraftBlockDep,
    GetAssetDep,
    GetDraftDep,
    IfMatchDep,
    RegisterAssetDep,
    ReorderDraftBlocksDep,
    StartRevisionDep,
    UpsertDraftBlockDep,
)
from proofprint.presentation.schemas.draft import (
    AssetCreatedResponse,
    AssetResponse,
    BlockMutationResponse,
    CreateAssetRequest,
    DraftResponse,
    ReorderBlocksRequest,
    ReorderBlocksResponse,
    SpecificationBlockResponse,
    StartRevisionRequest,
    UpsertSpecificationBlockRequest,
)
from proofprint.presentation.schemas.workspaces import WorkspaceResponse

router = APIRouter(prefix="/workspaces", tags=["workspace draft"])


def revision_etag(revision: int) -> str:
    return f'W/"{revision}"'


@router.get("/{workspace_id}/draft", response_model=DraftResponse)
def get_draft(
    workspace_id: UUID,
    response: Response,
    actor: CurrentActorDep,
    use_case: GetDraftDep,
) -> DraftResponse:
    workspace, grant, blocks = use_case.execute(actor, workspace_id)
    response.headers["ETag"] = revision_etag(workspace.revision)
    return DraftResponse.from_domain(workspace, grant, blocks)


@router.put("/{workspace_id}/blocks/{block_id}", response_model=BlockMutationResponse)
def upsert_block(
    workspace_id: UUID,
    block_id: UUID,
    payload: UpsertSpecificationBlockRequest,
    response: Response,
    expected_revision: IfMatchDep,
    actor: CurrentActorDep,
    use_case: UpsertDraftBlockDep,
) -> BlockMutationResponse:
    block, revision = use_case.execute(
        actor=actor,
        workspace_id=workspace_id,
        block_id=block_id,
        block_type=payload.block_type,
        label=payload.label,
        content=payload.content,
        position=payload.position,
        schema_version=payload.schema_version,
        expected_revision=expected_revision,
    )
    response.headers["ETag"] = revision_etag(revision)
    return BlockMutationResponse(
        block=SpecificationBlockResponse.from_domain(block),
        workspace_revision=revision,
    )


@router.delete("/{workspace_id}/blocks/{block_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_block(
    workspace_id: UUID,
    block_id: UUID,
    actor: CurrentActorDep,
    expected_revision: IfMatchDep,
    use_case: DeleteDraftBlockDep,
) -> Response:
    revision = use_case.execute(
        actor=actor,
        workspace_id=workspace_id,
        block_id=block_id,
        expected_revision=expected_revision,
    )
    return Response(
        status_code=status.HTTP_204_NO_CONTENT,
        headers={"ETag": revision_etag(revision)},
    )


@router.patch("/{workspace_id}/blocks/order", response_model=ReorderBlocksResponse)
def reorder_blocks(
    workspace_id: UUID,
    payload: ReorderBlocksRequest,
    response: Response,
    actor: CurrentActorDep,
    expected_revision: IfMatchDep,
    use_case: ReorderDraftBlocksDep,
) -> ReorderBlocksResponse:
    blocks, revision = use_case.execute(
        actor=actor,
        workspace_id=workspace_id,
        block_ids=payload.block_ids,
        expected_revision=expected_revision,
    )
    response.headers["ETag"] = revision_etag(revision)
    return ReorderBlocksResponse(
        blocks=[SpecificationBlockResponse.from_domain(item) for item in blocks],
        workspace_revision=revision,
    )


@router.post(
    "/{workspace_id}/assets",
    response_model=AssetCreatedResponse,
    status_code=status.HTTP_201_CREATED,
)
def register_asset(
    workspace_id: UUID,
    payload: CreateAssetRequest,
    response: Response,
    actor: CurrentActorDep,
    expected_revision: IfMatchDep,
    use_case: RegisterAssetDep,
) -> AssetCreatedResponse:
    asset, revision = use_case.execute(
        actor=actor,
        workspace_id=workspace_id,
        storage_key=payload.storage_key,
        original_filename=payload.original_filename,
        content_type=payload.content_type,
        size_bytes=payload.size_bytes,
        checksum=payload.checksum,
        expected_revision=expected_revision,
    )
    response.headers["ETag"] = revision_etag(revision)
    return AssetCreatedResponse(
        asset=AssetResponse.from_domain(asset), workspace_revision=revision
    )


@router.get("/{workspace_id}/assets/{asset_id}", response_model=AssetResponse)
def get_asset(
    workspace_id: UUID,
    asset_id: UUID,
    actor: CurrentActorDep,
    use_case: GetAssetDep,
) -> AssetResponse:
    return AssetResponse.from_domain(use_case.execute(actor, workspace_id, asset_id))


@router.post("/{workspace_id}/revisions", response_model=WorkspaceResponse)
def start_revision(
    workspace_id: UUID,
    payload: StartRevisionRequest,
    response: Response,
    actor: CurrentActorDep,
    expected_revision: IfMatchDep,
    use_case: StartRevisionDep,
) -> WorkspaceResponse:
    workspace = use_case.execute(
        actor=actor,
        workspace_id=workspace_id,
        reason=payload.reason,
        expected_revision=expected_revision,
    )
    response.headers["ETag"] = revision_etag(workspace.revision)
    return WorkspaceResponse.from_domain(workspace)
