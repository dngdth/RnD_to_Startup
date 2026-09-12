import json
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from proofprint.domain.entities import (
    Approval,
    OrderStatus,
    OrderWorkspace,
    SpecificationBlock,
    SpecificationVersion,
    canonical_json,
)
from proofprint.infrastructure.models import ApprovalRow, BlockRow, OrderRow, VersionRow


class SqlAlchemyOrderRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def get(self, order_id: UUID) -> OrderWorkspace | None:
        statement = (
            select(OrderRow)
            .where(OrderRow.id == order_id)
            .options(
                selectinload(OrderRow.blocks),
                selectinload(OrderRow.versions),
                selectinload(OrderRow.approvals),
            )
            .with_for_update(of=OrderRow)
        )
        row = self.session.scalar(statement)
        if row is None:
            return None
        return OrderWorkspace(
            id=row.id,
            customer_id=row.customer_id,
            product_type=row.product_type,
            status=OrderStatus(row.status),
            blocks={
                block.id: SpecificationBlock(
                    id=block.id,
                    block_type=block.block_type,
                    label=block.label,
                    content_json=canonical_json(block.content),
                    position=block.position,
                )
                for block in row.blocks
            },
            versions=tuple(
                SpecificationVersion(
                    id=version.id,
                    number=version.number,
                    snapshot_json=canonical_json(version.snapshot),
                    created_at=version.created_at,
                )
                for version in sorted(row.versions, key=lambda item: item.number)
            ),
            approvals=tuple(
                Approval(item.id, item.version_id, item.approver_id, item.created_at)
                for item in sorted(row.approvals, key=lambda item: item.created_at)
            ),
            approved_version_id=row.approved_version_id,
            production_version_id=row.production_version_id,
        )

    def save(self, order: OrderWorkspace) -> None:
        row = self.session.get(OrderRow, order.id)
        if row is None:
            row = OrderRow(id=order.id, customer_id=order.customer_id)
            self.session.add(row)
        row.product_type = order.product_type
        row.status = order.status.value
        row.approved_version_id = order.approved_version_id
        row.production_version_id = order.production_version_id

        existing_blocks = {block.id: block for block in row.blocks}
        for block in order.blocks.values():
            block_row = existing_blocks.get(block.id)
            if block_row is None:
                block_row = BlockRow(id=block.id, order=row)
                self.session.add(block_row)
            block_row.block_type = block.block_type
            block_row.label = block.label
            block_row.content = block.content
            block_row.position = block.position

        # Historical versions and approvals are append-only in this adapter.
        existing_version_ids = {item.id for item in row.versions}
        for version in order.versions:
            if version.id not in existing_version_ids:
                self.session.add(
                    VersionRow(
                        id=version.id,
                        order=row,
                        number=version.number,
                        snapshot=json.loads(version.snapshot_json),
                        created_at=version.created_at,
                    )
                )
        existing_approval_ids = {item.id for item in row.approvals}
        for approval in order.approvals:
            if approval.id not in existing_approval_ids:
                self.session.add(
                    ApprovalRow(
                        id=approval.id,
                        order=row,
                        version_id=approval.version_id,
                        approver_id=approval.approver_id,
                        created_at=approval.created_at,
                    )
                )
        self.session.commit()
