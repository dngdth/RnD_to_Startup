import json
from hashlib import sha256
from uuid import UUID, uuid4

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
from proofprint.infrastructure.models import (
    ApprovalRow,
    BlockRow,
    OrderRow,
    ReviewRoundRow,
    VersionRow,
)

MIGRATION_ACTOR_ID = UUID("00000000-0000-0000-0000-000000000000")


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
            status=OrderStatus(row.workflow_status),
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
            row = OrderRow(
                id=order.id,
                customer_id=order.customer_id,
                created_by=MIGRATION_ACTOR_ID,
            )
            self.session.add(row)
        row.product_type = order.product_type
        row.workflow_status = order.status.value
        row.approved_version_id = order.approved_version_id
        row.production_version_id = order.production_version_id

        existing_blocks = {block.id: block for block in row.blocks}
        for block in order.blocks.values():
            block_row = existing_blocks.get(block.id)
            if block_row is None:
                block_row = BlockRow(
                    id=block.id,
                    workspace=row,
                    created_by=MIGRATION_ACTOR_ID,
                    updated_by=MIGRATION_ACTOR_ID,
                )
                self.session.add(block_row)
            block_row.block_type = block.block_type
            block_row.label = block.label
            block_row.content = block.content
            block_row.position = block.position

        # Historical versions and approvals are append-only in this adapter.
        existing_version_ids = {item.id for item in row.versions}
        for version in order.versions:
            if version.id not in existing_version_ids:
                previous_version_id = row.latest_version_id
                for review in self.session.scalars(
                    select(ReviewRoundRow).where(
                        ReviewRoundRow.workspace_id == order.id,
                        ReviewRoundRow.status == "OPEN",
                    )
                ):
                    review.status = "CANCELLED"
                    review.closed_at = version.created_at
                self.session.add(
                    VersionRow(
                        id=version.id,
                        workspace=row,
                        number=version.number,
                        previous_version_id=previous_version_id,
                        snapshot=json.loads(version.snapshot_json),
                        content_hash=sha256(version.snapshot_json.encode()).hexdigest(),
                        created_by=MIGRATION_ACTOR_ID,
                        created_at=version.created_at,
                    )
                )
                self.session.add(
                    ReviewRoundRow(
                        id=uuid4(),
                        workspace_id=order.id,
                        version_id=version.id,
                        status="OPEN",
                        opened_at=version.created_at,
                    )
                )
                row.latest_version_id = version.id
        existing_approval_ids = {item.id for item in row.approvals}
        for approval in order.approvals:
            if approval.id not in existing_approval_ids:
                review = self.session.scalar(
                    select(ReviewRoundRow).where(
                        ReviewRoundRow.workspace_id == order.id,
                        ReviewRoundRow.version_id == approval.version_id,
                    )
                )
                if review is None:
                    raise RuntimeError("Published version is missing its review round")
                review.status = "APPROVED"
                review.closed_at = approval.created_at
                review.decided_by = approval.approver_id
                self.session.add(
                    ApprovalRow(
                        id=approval.id,
                        workspace=row,
                        review_round_id=review.id,
                        version_id=approval.version_id,
                        approver_id=approval.approver_id,
                        created_at=approval.created_at,
                    )
                )
        self.session.commit()
