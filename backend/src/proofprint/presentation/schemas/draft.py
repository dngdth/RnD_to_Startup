from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from proofprint.domain.entities.draft import Asset, AssetStatus, BlockType, SpecificationBlock
from proofprint.domain.entities.workspace import WorkspaceGrant, WorkspaceSummary
from proofprint.presentation.schemas.workspaces import WorkspaceResponse


class SpecificationBlockResponse(BaseModel):
    id: UUID
    workspace_id: UUID
    block_type: BlockType
    label: str
    content: dict[str, Any]
    position: int
    schema_version: int
    created_by: UUID
    updated_by: UUID
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_domain(cls, block: SpecificationBlock) -> SpecificationBlockResponse:
        return cls(
            id=block.id,
            workspace_id=block.workspace_id,
            block_type=block.block_type,
            label=block.label,
            content=block.content,
            position=block.position,
            schema_version=block.schema_version,
            created_by=block.created_by,
            updated_by=block.updated_by,
            created_at=block.created_at,
            updated_at=block.updated_at,
        )


class DraftResponse(BaseModel):
    workspace: WorkspaceResponse
    blocks: list[SpecificationBlockResponse]

    @classmethod
    def from_domain(
        cls,
        workspace: WorkspaceSummary,
        grant: WorkspaceGrant,
        blocks: list[SpecificationBlock],
    ) -> DraftResponse:
        return cls(
            workspace=WorkspaceResponse.from_domain(workspace, grant),
            blocks=[SpecificationBlockResponse.from_domain(item) for item in blocks],
        )


class UpsertSpecificationBlockRequest(BaseModel):
    block_type: BlockType
    label: str = Field(min_length=1, max_length=200)
    content: dict[str, Any]
    position: int = Field(ge=0)
    schema_version: int = Field(default=1, ge=1)

    @field_validator("label")
    @classmethod
    def normalize_label(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("label must not be blank")
        return normalized


class BlockMutationResponse(BaseModel):
    block: SpecificationBlockResponse
    workspace_revision: int


class ReorderBlocksRequest(BaseModel):
    block_ids: list[UUID]


class ReorderBlocksResponse(BaseModel):
    blocks: list[SpecificationBlockResponse]
    workspace_revision: int


class CreateAssetRequest(BaseModel):
    storage_key: str = Field(min_length=1, max_length=1024)
    original_filename: str = Field(min_length=1, max_length=500)
    content_type: str = Field(min_length=1, max_length=255)
    size_bytes: int = Field(ge=0)
    checksum: str = Field(min_length=64, max_length=64)

    @field_validator("storage_key", "original_filename", "content_type", "checksum")
    @classmethod
    def reject_blank_values(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("value must not be blank")
        return normalized


class AssetResponse(BaseModel):
    id: UUID
    workspace_id: UUID
    storage_key: str
    original_filename: str
    content_type: str
    size_bytes: int
    checksum: str
    status: AssetStatus
    uploaded_by: UUID
    created_at: datetime

    @classmethod
    def from_domain(cls, asset: Asset) -> AssetResponse:
        return cls(
            id=asset.id,
            workspace_id=asset.workspace_id,
            storage_key=asset.storage_key,
            original_filename=asset.original_filename,
            content_type=asset.content_type,
            size_bytes=asset.size_bytes,
            checksum=asset.checksum,
            status=asset.status,
            uploaded_by=asset.uploaded_by,
            created_at=asset.created_at,
        )


class AssetCreatedResponse(BaseModel):
    asset: AssetResponse
    workspace_revision: int


class StartRevisionRequest(BaseModel):
    reason: str = Field(min_length=3, max_length=500)

    @field_validator("reason")
    @classmethod
    def normalize_reason(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("reason must not be blank")
        return normalized
