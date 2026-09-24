"""PostgreSQL integration check for publishing and resolving draft feedback."""

import os
from uuid import uuid4

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from proofprint.application.use_cases.create_workspace import CreateWorkspace, InitialBlockInput
from proofprint.application.use_cases.manage_draft import StartRevision
from proofprint.application.use_cases.manage_versions import ReleaseVersion
from proofprint.domain.entities.draft import BlockType
from proofprint.domain.entities.identity import CurrentActor, SystemRole
from proofprint.infrastructure.models import CommentRow, ReviewRoundRow, UserRow, WorkspaceRow
from proofprint.infrastructure.repositories.draft import SqlAlchemyDraftRepository
from proofprint.infrastructure.repositories.review_access import (
    SqlAlchemyReviewAccessRepository,
    SqlAlchemyWorkspaceCommandRepository,
)
from proofprint.infrastructure.repositories.versions import SqlAlchemyVersionRepository
from proofprint.infrastructure.security.review_tokens import HmacReviewLinkTokenCodec
from proofprint.infrastructure.unit_of_work import SqlAlchemyUnitOfWork


@pytest.mark.skipif(
    not os.getenv("PROOFPRINT_TEST_DATABASE_URL"),
    reason="Set PROOFPRINT_TEST_DATABASE_URL to an upgraded PostgreSQL database",
)
def test_publish_resolves_only_feedback_for_selected_changed_block() -> None:
    engine = create_engine(
        os.environ["PROOFPRINT_TEST_DATABASE_URL"], connect_args={"connect_timeout": 5}
    )
    with engine.connect() as connection:
        outer_transaction = connection.begin()
        try:
            with Session(bind=connection, join_transaction_mode="create_savepoint") as session:
                actor_id = uuid4()
                email = f"integration-{actor_id}@example.test"
                session.add(UserRow(
                    id=actor_id, email=email, display_name="Integration Designer",
                    system_role="DESIGNER", status="ACTIVE",
                ))
                session.flush()
                actor = CurrentActor(
                    id=actor_id, email=email, display_name="Integration Designer",
                    system_role=SystemRole.DESIGNER,
                )
                created = CreateWorkspace(
                    SqlAlchemyWorkspaceCommandRepository(session),
                    SqlAlchemyReviewAccessRepository(session),
                    HmacReviewLinkTokenCodec("integration-secret-at-least-32-characters"),
                    SqlAlchemyUnitOfWork(session),
                    "https://example.test",
                ).execute(
                    actor=actor, customer_name="Integration Customer", customer_email=None,
                    customer_phone=None, product_type="Áo thun", idempotency_key=str(uuid4()),
                    initial_blocks=[
                        InitialBlockInput(BlockType.COLOR, "Màu sắc", {"name": "Xanh"}),
                        InitialBlockInput(BlockType.TEXT, "Ghi chú", {"value": "Giữ nguyên"}),
                    ],
                )
                versions = SqlAlchemyVersionRepository(session)
                block_ids = [block.id for block in versions.list_blocks(created.workspace.id)]
                request_ids = [uuid4(), uuid4()]
                for request_id, block_id in zip(request_ids, block_ids, strict=True):
                    session.add(CommentRow(
                        id=request_id, workspace_id=created.workspace.id, block_id=block_id,
                        request_batch_id=uuid4(), body="Sửa hạng mục này", author_id=actor_id,
                    ))
                session.flush()

                version, _, _ = ReleaseVersion(versions, SqlAlchemyUnitOfWork(session)).execute(
                    actor=actor, workspace_id=created.workspace.id,
                    expected_revision=created.workspace.revision, idempotency_key=str(uuid4()),
                    resolved_request_block_ids=[block_ids[0]],
                )

                session.expire_all()
                assert version.version.number == 1
                assert session.get(CommentRow, request_ids[0]).resolved_in_version_id == version.version.id
                assert session.get(CommentRow, request_ids[1]).resolved_in_version_id is None

                workspace_row = session.get(WorkspaceRow, created.workspace.id)
                assert workspace_row is not None
                assert workspace_row.workflow_status == "IN_REVIEW"
                review_round = session.query(ReviewRoundRow).filter_by(
                    workspace_id=created.workspace.id, status="OPEN"
                ).one()
                StartRevision(
                    SqlAlchemyDraftRepository(session), SqlAlchemyUnitOfWork(session)
                ).execute(
                    actor=actor, workspace_id=created.workspace.id,
                    expected_revision=workspace_row.revision,
                    reason="Designer chỉnh sửa hồ sơ sản phẩm",
                    idempotency_key=str(uuid4()),
                )
                session.expire_all()
                assert session.get(WorkspaceRow, created.workspace.id).workflow_status == "DRAFT"
                assert session.get(ReviewRoundRow, review_round.id).status == "CANCELLED"
        finally:
            outer_transaction.rollback()
            engine.dispose()
