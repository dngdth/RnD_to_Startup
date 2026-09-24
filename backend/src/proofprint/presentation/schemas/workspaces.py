from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from proofprint.domain.entities.draft import BlockType
from proofprint.domain.entities.identity import SystemRole
from proofprint.domain.entities.workspace import WorkspaceGrant, WorkspaceSummary


class WorkspacePermissionsResponse(BaseModel):
    role: SystemRole
    can_view: bool
    can_edit: bool
    can_review: bool
    can_approve: bool
    can_lock_production: bool

    @classmethod
    def from_domain(cls, grant: WorkspaceGrant) -> WorkspacePermissionsResponse:
        return cls(
            role=grant.role,
            can_view=grant.can_view,
            can_edit=grant.can_edit,
            can_review=grant.can_review,
            can_approve=grant.can_approve,
            can_lock_production=grant.can_lock_production,
        )


class WorkspaceResponse(BaseModel):
    id: UUID
    customer_id: UUID
    customer_name: str
    customer_email: str | None
    customer_phone: str | None
    product_type: str
    workflow_status: str
    record_status: str
    latest_version_id: UUID | None
    approved_version_id: UUID | None
    production_version_id: UUID | None
    revision: int
    updated_at: datetime
    permissions: WorkspacePermissionsResponse | None = None

    @classmethod
    def from_domain(
        cls, workspace: WorkspaceSummary, grant: WorkspaceGrant | None = None
    ) -> WorkspaceResponse:
        return cls(
            id=workspace.id,
            customer_id=workspace.customer_id,
            customer_name=workspace.customer_name,
            customer_email=workspace.customer_email,
            customer_phone=workspace.customer_phone,
            product_type=workspace.product_type,
            workflow_status=workspace.workflow_status,
            record_status=workspace.record_status,
            latest_version_id=workspace.latest_version_id,
            approved_version_id=workspace.approved_version_id,
            production_version_id=workspace.production_version_id,
            revision=workspace.revision,
            updated_at=workspace.updated_at,
            permissions=(
                WorkspacePermissionsResponse.from_domain(grant) if grant is not None else None
            ),
        )


class CustomerInput(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    email: str | None = Field(default=None, max_length=320)
    phone: str | None = Field(default=None, max_length=40)

    @field_validator("name")
    @classmethod
    def reject_blank_name(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("customer name must not be blank")
        return normalized

    @field_validator("email", "phone")
    @classmethod
    def normalize_optional_contact(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None


class InitialBlockRequest(BaseModel):
    block_type: BlockType
    label: str = Field(min_length=1, max_length=200)
    content: dict[str, Any]

    @field_validator("label")
    @classmethod
    def normalize_label(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("label must not be blank")
        return normalized


class CreateWorkspaceRequest(BaseModel):
    customer: CustomerInput
    product_type: str = Field(min_length=1, max_length=80)
    initial_blocks: list[InitialBlockRequest] = Field(default_factory=list, max_length=30)

    @field_validator("product_type")
    @classmethod
    def reject_blank_product_type(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("product_type must not be blank")
        return normalized


class ReviewLinkResponse(BaseModel):
    id: UUID
    workspace_id: UUID
    version: int
    status: str
    review_url: str
    created_at: datetime


class WorkspaceCreatedResponse(BaseModel):
    workspace: WorkspaceResponse
    review_link: ReviewLinkResponse


class ReviewLinkCommandRequest(BaseModel):
    reason: str = Field(min_length=3, max_length=500)
