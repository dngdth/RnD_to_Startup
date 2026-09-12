from typing import Any
from uuid import UUID

from fastapi import APIRouter, HTTPException, Request, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from proofprint.domain.entities import OrderWorkspace, SpecificationVersion
from proofprint.domain.errors import (
    DomainError,
    InvalidState,
    OrderNotFound,
    StaleVersion,
    VersionNotFound,
)
from proofprint.presentation.dependencies import ServiceDep


class CreateOrderRequest(BaseModel):
    customer_id: UUID
    product_type: str = Field(default="apparel", min_length=1, max_length=80)


class PutBlockRequest(BaseModel):
    block_type: str = Field(min_length=1, max_length=80)
    label: str = Field(min_length=1, max_length=200)
    content: dict[str, Any]
    position: int = Field(default=0, ge=0)


class ApproveRequest(BaseModel):
    approver_id: UUID


def version_view(version: SpecificationVersion) -> dict[str, Any]:
    return {
        "id": version.id,
        "number": version.number,
        "snapshot": version.snapshot,
        "created_at": version.created_at,
    }


def order_view(order: OrderWorkspace) -> dict[str, Any]:
    return {
        "id": order.id,
        "customer_id": order.customer_id,
        "product_type": order.product_type,
        "status": order.status,
        "blocks": [
            block.as_snapshot()
            for block in sorted(
                order.blocks.values(), key=lambda item: (item.position, str(item.id))
            )
        ],
        "versions": [
            {"id": version.id, "number": version.number, "created_at": version.created_at}
            for version in order.versions
        ],
        "approvals": [
            {
                "id": approval.id,
                "version_id": approval.version_id,
                "approver_id": approval.approver_id,
                "created_at": approval.created_at,
            }
            for approval in order.approvals
        ],
        "approved_version_id": order.approved_version_id,
        "production_version_id": order.production_version_id,
    }


router = APIRouter()


async def handle_domain_error(_request: Request, exc: DomainError) -> JSONResponse:

    if isinstance(exc, (OrderNotFound, VersionNotFound)):
        code = status.HTTP_404_NOT_FOUND
    elif isinstance(exc, (InvalidState, StaleVersion)):
        code = status.HTTP_409_CONFLICT
    else:
        code = status.HTTP_422_UNPROCESSABLE_ENTITY
    return JSONResponse(status_code=code, content={"detail": str(exc)})


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@router.post("/api/v1/orders", status_code=status.HTTP_201_CREATED)
def create_order(payload: CreateOrderRequest, service: ServiceDep) -> dict[str, Any]:
    try:
        return order_view(
            service.create(customer_id=payload.customer_id, product_type=payload.product_type)
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.get("/api/v1/orders/{order_id}")
def get_order(order_id: UUID, service: ServiceDep) -> dict[str, Any]:
    return order_view(service.get(order_id))


@router.get("/api/v1/orders/{order_id}/versions/{version_id}")
def get_version(order_id: UUID, version_id: UUID, service: ServiceDep) -> dict[str, Any]:
    return version_view(service.get_version(order_id=order_id, version_id=version_id))


@router.get("/api/v1/orders/{order_id}/production-snapshot")
def get_production_snapshot(order_id: UUID, service: ServiceDep) -> dict[str, Any]:
    return version_view(service.get_production_snapshot(order_id))


@router.put("/api/v1/orders/{order_id}/blocks/{block_id}")
def put_block(
    order_id: UUID,
    block_id: UUID,
    payload: PutBlockRequest,
    service: ServiceDep,
) -> dict[str, Any]:
    try:
        return order_view(
            service.put_block(
                order_id=order_id,
                block_id=block_id,
                block_type=payload.block_type,
                label=payload.label,
                content=payload.content,
                position=payload.position,
            )
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.post("/api/v1/orders/{order_id}/versions", status_code=status.HTTP_201_CREATED)
def publish_version(order_id: UUID, service: ServiceDep) -> dict[str, Any]:
    return version_view(service.publish_version(order_id))


@router.post("/api/v1/orders/{order_id}/versions/{version_id}/approve")
def approve_version(
    order_id: UUID,
    version_id: UUID,
    payload: ApproveRequest,
    service: ServiceDep,
) -> dict[str, Any]:
    return order_view(
        service.approve(order_id=order_id, version_id=version_id, approver_id=payload.approver_id)
    )


@router.post("/api/v1/orders/{order_id}/production-lock")
def lock_for_production(order_id: UUID, service: ServiceDep) -> dict[str, Any]:
    return order_view(service.lock_for_production(order_id))
