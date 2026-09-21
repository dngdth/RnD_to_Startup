from dataclasses import replace
from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import UUID, uuid4

import pytest

from proofprint.application.use_cases.manage_workspace_lifecycle import (
    ArchiveWorkspace,
    CancelWorkspace,
    ListWorkspaceAuditEvents,
    RestoreWorkspace,
)
from proofprint.domain.entities.identity import CurrentActor, SystemRole
from proofprint.domain.entities.workspace import WorkspaceGrant, WorkspaceSummary
from proofprint.domain.entities.workspace_lifecycle import WorkspaceAuditEvent, WorkspaceAuditPage
from proofprint.domain.exceptions import (
    Conflict,
    PermissionDenied,
    PreconditionFailed,
    ResourceNotFound,
    ValidationFailed,
)


class FakeUnitOfWork:
    def __init__(self) -> None:
        self.commits = 0
        self.rollbacks = 0

    def commit(self) -> None:
        self.commits += 1

    def rollback(self) -> None:
        self.rollbacks += 1


class FakeLifecycleRepository:
    def __init__(self, workspace: WorkspaceSummary, owner: CurrentActor) -> None:
        self.workspace = workspace
        self.owner_id = owner.id
        self.grants: dict[UUID, WorkspaceGrant] = {
            owner.id: self._grant(workspace.id, view=True, edit=True)
        }
        self.audit_events: list[WorkspaceAuditEvent] = []
        self.outbox: list[tuple[str, dict[str, Any]]] = []
        self.lock_count = 0

    @staticmethod
    def _grant(workspace_id: UUID, *, view: bool, edit: bool) -> WorkspaceGrant:
        return WorkspaceGrant(
            workspace_id=workspace_id,
            role=SystemRole.DESIGNER,
            can_view=view,
            can_edit=edit,
            can_review=False,
            can_approve=False,
            can_lock_production=False,
        )

    def get_workspace(self, workspace_id: UUID) -> WorkspaceSummary | None:
        return self.workspace if workspace_id == self.workspace.id else None

    def get_workspace_for_update(self, workspace_id: UUID) -> WorkspaceSummary | None:
        self.lock_count += 1
        return self.get_workspace(workspace_id)

    def get_active_grant(self, workspace_id: UUID, user_id: UUID) -> WorkspaceGrant | None:
        if workspace_id != self.workspace.id:
            return None
        return self.grants.get(user_id)

    def get_workspace_owner_id(self, workspace_id: UUID) -> UUID | None:
        return self.owner_id if workspace_id == self.workspace.id else None

    def list_audit_events(
        self,
        workspace_id: UUID,
        *,
        limit: int,
        offset: int,
        event_type: str | None,
        entity_type: str | None,
        actor_id: UUID | None,
        guest_session_id: UUID | None,
        created_from: datetime | None,
        created_to: datetime | None,
    ) -> WorkspaceAuditPage:
        items = [item for item in self.audit_events if item.workspace_id == workspace_id]
        if event_type is not None:
            items = [item for item in items if item.event_type == event_type]
        if entity_type is not None:
            items = [item for item in items if item.entity_type == entity_type]
        if actor_id is not None:
            items = [item for item in items if item.actor_id == actor_id]
        if guest_session_id is not None:
            items = [item for item in items if item.guest_session_id == guest_session_id]
        if created_from is not None:
            items = [item for item in items if item.created_at >= created_from]
        if created_to is not None:
            items = [item for item in items if item.created_at <= created_to]
        items.sort(key=lambda item: (item.created_at, item.id), reverse=True)
        return WorkspaceAuditPage(items[offset : offset + limit], len(items), limit, offset)

    def update_record_status(
        self,
        workspace_id: UUID,
        *,
        record_status: str,
        revision: int,
        updated_at: datetime,
    ) -> None:
        assert workspace_id == self.workspace.id
        self.workspace = replace(
            self.workspace, record_status=record_status, revision=revision, updated_at=updated_at
        )

    def add_audit_event(
        self,
        *,
        workspace_id: UUID,
        actor_id: UUID,
        event_type: str,
        entity_type: str,
        entity_id: UUID,
        metadata: dict[str, Any],
    ) -> None:
        self.audit_events.append(
            WorkspaceAuditEvent(
                id=uuid4(),
                workspace_id=workspace_id,
                actor_id=actor_id,
                guest_session_id=None,
                actor_username_snapshot=None,
                event_type=event_type,
                entity_type=entity_type,
                entity_id=entity_id,
                version_id=None,
                metadata=metadata,
                created_at=datetime.now(UTC),
            )
        )

    def add_outbox_message(self, event_type: str, payload: dict[str, Any]) -> None:
        self.outbox.append((event_type, payload))


@pytest.fixture
def setup() -> tuple[FakeLifecycleRepository, FakeUnitOfWork, CurrentActor]:
    owner = CurrentActor(uuid4(), "designer@example.com", "Designer", SystemRole.DESIGNER)
    workspace = WorkspaceSummary(
        id=uuid4(),
        customer_id=uuid4(),
        customer_name="Customer",
        customer_email=None,
        customer_phone=None,
        product_type="packaging",
        workflow_status="DRAFT",
        record_status="ACTIVE",
        latest_version_id=None,
        approved_version_id=None,
        production_version_id=None,
        revision=4,
        updated_at=datetime.now(UTC),
    )
    return FakeLifecycleRepository(workspace, owner), FakeUnitOfWork(), owner


def test_archive_restore_cancel_preserve_workflow_and_audit(
    setup: tuple[FakeLifecycleRepository, FakeUnitOfWork, CurrentActor],
) -> None:
    repo, uow, owner = setup
    workspace_id = repo.workspace.id
    repo.workspace = replace(repo.workspace, workflow_status="IN_REVIEW")
    archived = ArchiveWorkspace(repo, uow).execute(
        actor=owner, workspace_id=workspace_id, expected_revision=4, reason="Project paused"
    )
    assert (archived.record_status, archived.workflow_status, archived.revision) == (
        "ARCHIVED",
        "IN_REVIEW",
        5,
    )
    restored = RestoreWorkspace(repo, uow).execute(
        actor=owner, workspace_id=workspace_id, expected_revision=5
    )
    assert (restored.record_status, restored.revision) == ("ACTIVE", 6)
    cancelled = CancelWorkspace(repo, uow).execute(
        actor=owner, workspace_id=workspace_id, expected_revision=6, reason="Client withdrew"
    )
    assert (cancelled.record_status, cancelled.revision) == ("CANCELLED", 7)
    assert [item.event_type for item in repo.audit_events] == [
        "WORKSPACE_ARCHIVED",
        "WORKSPACE_RESTORED",
        "WORKSPACE_CANCELLED",
    ]
    assert [item[0] for item in repo.outbox] == [item.event_type for item in repo.audit_events]
    assert repo.audit_events[0].metadata["reason"] == "Project paused"
    assert [item.metadata["workspace_revision"] for item in repo.audit_events] == [5, 6, 7]
    assert (uow.commits, uow.rollbacks, repo.lock_count) == (3, 0, 3)
    with pytest.raises(Conflict):
        RestoreWorkspace(repo, uow).execute(
            actor=owner, workspace_id=workspace_id, expected_revision=7
        )


def test_archive_requires_reason_and_matching_revision(
    setup: tuple[FakeLifecycleRepository, FakeUnitOfWork, CurrentActor],
) -> None:
    repo, uow, owner = setup
    with pytest.raises(PreconditionFailed):
        ArchiveWorkspace(repo, uow).execute(
            actor=owner, workspace_id=repo.workspace.id, expected_revision=3, reason="Valid reason"
        )
    with pytest.raises(ValidationFailed):
        ArchiveWorkspace(repo, uow).execute(
            actor=owner, workspace_id=repo.workspace.id, expected_revision=4, reason="  "
        )
    assert repo.workspace.record_status == "ACTIVE"
    assert not repo.audit_events and not repo.outbox
    assert uow.commits == 0


def test_cancel_rejects_production_lock_and_archived_record(
    setup: tuple[FakeLifecycleRepository, FakeUnitOfWork, CurrentActor],
) -> None:
    repo, uow, owner = setup
    repo.workspace = replace(repo.workspace, workflow_status="LOCKED_FOR_PRODUCTION")
    with pytest.raises(Conflict):
        CancelWorkspace(repo, uow).execute(
            actor=owner, workspace_id=repo.workspace.id, expected_revision=4
        )
    ArchiveWorkspace(repo, uow).execute(
        actor=owner, workspace_id=repo.workspace.id, expected_revision=4, reason="Archive it"
    )
    with pytest.raises(Conflict):
        CancelWorkspace(repo, uow).execute(
            actor=owner, workspace_id=repo.workspace.id, expected_revision=5
        )


def test_cancel_rejects_draft_revision_after_prior_production_lock(
    setup: tuple[FakeLifecycleRepository, FakeUnitOfWork, CurrentActor],
) -> None:
    repo, uow, owner = setup
    repo.workspace = replace(repo.workspace, production_version_id=uuid4())
    with pytest.raises(Conflict):
        CancelWorkspace(repo, uow).execute(
            actor=owner, workspace_id=repo.workspace.id, expected_revision=4
        )
    assert repo.workspace.record_status == "ACTIVE"
    assert uow.commits == 0


def test_restore_is_owner_only_but_archive_can_be_editor(
    setup: tuple[FakeLifecycleRepository, FakeUnitOfWork, CurrentActor],
) -> None:
    repo, uow, owner = setup
    editor = CurrentActor(uuid4(), "editor@example.com", "Editor", SystemRole.DESIGNER)
    repo.grants[editor.id] = repo._grant(repo.workspace.id, view=True, edit=True)
    ArchiveWorkspace(repo, uow).execute(
        actor=editor, workspace_id=repo.workspace.id, expected_revision=4, reason="Archive it"
    )
    with pytest.raises(PermissionDenied):
        RestoreWorkspace(repo, uow).execute(
            actor=editor, workspace_id=repo.workspace.id, expected_revision=5
        )
    assert repo.workspace.record_status == "ARCHIVED"
    restored = RestoreWorkspace(repo, uow).execute(
        actor=owner, workspace_id=repo.workspace.id, expected_revision=5
    )
    assert restored.record_status == "ACTIVE"


def test_outsider_and_admin_cannot_access_lifecycle_or_audit(
    setup: tuple[FakeLifecycleRepository, FakeUnitOfWork, CurrentActor],
) -> None:
    repo, uow, _ = setup
    outsider = CurrentActor(uuid4(), "other@example.com", "Other", SystemRole.DESIGNER)
    admin = CurrentActor(uuid4(), "admin@example.com", "Admin", SystemRole.ADMIN)
    with pytest.raises(ResourceNotFound):
        ListWorkspaceAuditEvents(repo).execute(actor=outsider, workspace_id=repo.workspace.id)
    with pytest.raises(ResourceNotFound):
        ArchiveWorkspace(repo, uow).execute(
            actor=outsider, workspace_id=repo.workspace.id, expected_revision=4, reason="Reason"
        )
    with pytest.raises(PermissionDenied):
        ListWorkspaceAuditEvents(repo).execute(actor=admin, workspace_id=repo.workspace.id)
    assert repo.lock_count == 0


def test_audit_history_filters_paginates_and_remains_readable_after_cancel(
    setup: tuple[FakeLifecycleRepository, FakeUnitOfWork, CurrentActor],
) -> None:
    repo, uow, owner = setup
    now = datetime.now(UTC)
    guest_id = uuid4()
    for index in range(4):
        repo.audit_events.append(
            WorkspaceAuditEvent(
                id=UUID(int=index + 1),
                workspace_id=repo.workspace.id,
                actor_id=owner.id if index % 2 else None,
                guest_session_id=guest_id if index % 2 == 0 else None,
                actor_username_snapshot="guest" if index % 2 == 0 else None,
                event_type="COMMENT_CREATED" if index % 2 == 0 else "VERSION_RELEASED",
                entity_type="Comment" if index % 2 == 0 else "SpecificationVersion",
                entity_id=uuid4(),
                version_id=None,
                metadata={},
                created_at=now - timedelta(minutes=index),
            )
        )
    CancelWorkspace(repo, uow).execute(
        actor=owner, workspace_id=repo.workspace.id, expected_revision=4
    )
    page = ListWorkspaceAuditEvents(repo).execute(
        actor=owner,
        workspace_id=repo.workspace.id,
        limit=1,
        offset=1,
        event_type="COMMENT_CREATED",
        guest_session_id=guest_id,
    )
    assert (page.total, page.limit, page.offset) == (2, 1, 1)
    assert [item.id for item in page.items] == [UUID(int=3)]
    with pytest.raises(ValidationFailed):
        ListWorkspaceAuditEvents(repo).execute(
            actor=owner, workspace_id=repo.workspace.id, limit=101
        )
