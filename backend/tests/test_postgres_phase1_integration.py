"""Optional PostgreSQL integration test; set PROOFPRINT_TEST_DATABASE_URL to run."""

import os
from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest
from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import Session, sessionmaker

from proofprint.application.use_cases.create_workspace import CreateWorkspace
from proofprint.application.use_cases.manage_draft import UpsertDraftBlock
from proofprint.application.use_cases.manage_versions import ReleaseVersion
from proofprint.domain.entities.draft import BlockType
from proofprint.domain.entities.identity import CurrentActor, SystemRole
from proofprint.infrastructure.models import (
    AuditEventRow,
    CustomerRow,
    OutboxMessageRow,
    SpecificationVersionRow,
    UserRow,
    WorkspaceCreationRequestRow,
    WorkspaceRow,
)
from proofprint.infrastructure.outbox import OutboxDispatcher
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
def test_workspace_create_replay_is_durable_and_atomic() -> None:
    engine = create_engine(
        os.environ["PROOFPRINT_TEST_DATABASE_URL"], connect_args={"connect_timeout": 5}
    )
    actor_id = uuid4()
    with engine.connect() as connection:
        outer_transaction = connection.begin()
        try:
            with Session(bind=connection, join_transaction_mode="create_savepoint") as session:
                session.add(
                    UserRow(
                        id=actor_id,
                        email=f"integration-{actor_id}@example.test",
                        display_name="Integration Designer",
                        system_role="DESIGNER",
                        status="ACTIVE",
                    )
                )
                session.flush()
                actor = CurrentActor(
                    id=actor_id, email=f"integration-{actor_id}@example.test",
                    display_name="Integration Designer", system_role=SystemRole.DESIGNER,
                )
                use_case = CreateWorkspace(
                    SqlAlchemyWorkspaceCommandRepository(session),
                    SqlAlchemyReviewAccessRepository(session),
                    HmacReviewLinkTokenCodec("integration-secret-at-least-32-characters"),
                    SqlAlchemyUnitOfWork(session),
                    "https://example.test",
                )
                kwargs = {
                    "actor": actor,
                    "customer_name": "Integration Customer",
                    "customer_email": None,
                    "customer_phone": None,
                    "product_type": "apparel",
                    "idempotency_key": "same-request",
                }
                created = use_case.execute(**kwargs)
                replay = use_case.execute(**kwargs)
                assert replay == created
                assert session.scalar(
                    select(func.count()).select_from(CustomerRow).where(
                        CustomerRow.id == created.workspace.customer_id
                    )
                ) == 1
                assert session.scalar(
                    select(func.count()).select_from(WorkspaceRow).where(
                        WorkspaceRow.id == created.workspace.id
                    )
                ) == 1
                assert session.scalar(
                    select(func.count()).select_from(WorkspaceCreationRequestRow).where(
                        WorkspaceCreationRequestRow.actor_id == actor_id
                    )
                ) == 1
                assert session.scalar(
                    select(func.count()).select_from(AuditEventRow).where(
                        AuditEventRow.workspace_id == created.workspace.id
                    )
                ) == 3
        finally:
            outer_transaction.rollback()
    engine.dispose()


@pytest.mark.skipif(
    not os.getenv("PROOFPRINT_TEST_DATABASE_URL"),
    reason="Set PROOFPRINT_TEST_DATABASE_URL to an upgraded PostgreSQL database",
)
def test_released_version_snapshot_survives_later_draft_edit() -> None:
    engine = create_engine(
        os.environ["PROOFPRINT_TEST_DATABASE_URL"], connect_args={"connect_timeout": 5}
    )
    actor_id, block_id = uuid4(), uuid4()
    with engine.connect() as connection:
        outer_transaction = connection.begin()
        try:
            with Session(bind=connection, join_transaction_mode="create_savepoint") as session:
                session.add(
                    UserRow(
                        id=actor_id, email=f"version-{actor_id}@example.test",
                        display_name="Version Designer", system_role="DESIGNER", status="ACTIVE",
                    )
                )
                session.flush()
                actor = CurrentActor(
                    id=actor_id, email=f"version-{actor_id}@example.test",
                    display_name="Version Designer", system_role=SystemRole.DESIGNER,
                )
                created = CreateWorkspace(
                    SqlAlchemyWorkspaceCommandRepository(session),
                    SqlAlchemyReviewAccessRepository(session),
                    HmacReviewLinkTokenCodec("integration-secret-at-least-32-characters"),
                    SqlAlchemyUnitOfWork(session), "https://example.test",
                ).execute(
                    actor=actor, customer_name="Version Customer", customer_email=None,
                    customer_phone=None, product_type="apparel",
                    idempotency_key="version-workspace",
                )
                workspace_id = created.workspace.id
                draft = UpsertDraftBlock(
                    SqlAlchemyDraftRepository(session), SqlAlchemyUnitOfWork(session)
                )
                draft.execute(
                    actor=actor, workspace_id=workspace_id, block_id=block_id,
                    block_type=BlockType.TEXT, label="Description",
                    content={"value": "Original"}, position=0, schema_version=1,
                    expected_revision=0,
                )
                version, _, _ = ReleaseVersion(
                    SqlAlchemyVersionRepository(session), SqlAlchemyUnitOfWork(session)
                ).execute(
                    actor=actor, workspace_id=workspace_id, expected_revision=1,
                    idempotency_key="release-one",
                )
                # The next draft cycle edits the mutable row, not the released JSONB snapshot.
                workspace_row = session.get(WorkspaceRow, workspace_id)
                workspace_row.workflow_status = "DRAFT"
                workspace_row.revision = 3
                session.flush()
                draft.execute(
                    actor=actor, workspace_id=workspace_id, block_id=block_id,
                    block_type=BlockType.TEXT, label="Description",
                    content={"value": "Changed later"}, position=0, schema_version=1,
                    expected_revision=3,
                )
                session.expire_all()
                stored = session.get(SpecificationVersionRow, version.version.id)
                assert stored.snapshot[0]["content"] == {"value": "Original"}
        finally:
            outer_transaction.rollback()
    engine.dispose()


@pytest.mark.skipif(
    not os.getenv("PROOFPRINT_TEST_DATABASE_URL"),
    reason="Set PROOFPRINT_TEST_DATABASE_URL to an upgraded PostgreSQL database",
)
def test_outbox_retries_failed_delivery_without_losing_event() -> None:
    engine = create_engine(
        os.environ["PROOFPRINT_TEST_DATABASE_URL"], connect_args={"connect_timeout": 5}
    )
    event_id = uuid4()
    with engine.connect() as connection:
        outer_transaction = connection.begin()
        sessions = sessionmaker(bind=connection, join_transaction_mode="create_savepoint")
        try:
            with sessions.begin() as session:
                session.add(
                    OutboxMessageRow(
                        id=event_id, event_type="VERSION_RELEASED",
                        payload={"workspace_id": str(uuid4())}, status="PENDING",
                        created_at=datetime(2000, 1, 1, tzinfo=UTC),
                    )
                )

            def fail_once(_event_id, _event_type, _payload) -> None:
                raise OSError("delivery unavailable")

            assert OutboxDispatcher(sessions, fail_once).dispatch_one()
            with sessions.begin() as session:
                row = session.get(OutboxMessageRow, event_id)
                assert row.status == "FAILED"
                assert row.attempt_count == 1
                row.locked_at = datetime.now(UTC) - timedelta(seconds=31)

            delivered = []
            assert OutboxDispatcher(
                sessions, lambda *args: delivered.append(args)
            ).dispatch_one()
            assert len(delivered) == 1
            assert delivered[0][0] == event_id
            with sessions.begin() as session:
                row = session.get(OutboxMessageRow, event_id)
                assert row.status == "PROCESSED"
                assert row.attempt_count == 2
                assert row.processed_at is not None
        finally:
            outer_transaction.rollback()
    engine.dispose()
