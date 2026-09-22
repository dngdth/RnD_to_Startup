import unittest
from dataclasses import replace
from datetime import datetime
from uuid import UUID, uuid4

from proofprint.application.use_cases import (
    CreateGuestSession,
    CreateWorkspace,
    DisableReviewLink,
    ResolveGuestSession,
    RotateReviewLink,
)
from proofprint.domain.entities.identity import CurrentActor, SystemRole
from proofprint.domain.entities.review_access import (
    GuestSessionStatus,
    ReviewLinkStatus,
    WorkspaceGuestSession,
    WorkspaceReviewLink,
)
from proofprint.domain.entities.workspace import WorkspaceCustomer, WorkspaceGrant, WorkspaceSummary
from proofprint.domain.exceptions import (
    AuthenticationRequired,
    Conflict,
    PermissionDenied,
    PreconditionFailed,
    ResourceNotFound,
)
from proofprint.infrastructure.security import (
    HmacReviewLinkTokenCodec,
    OpaqueGuestSessionTokenService,
)


class FakeUnitOfWork:
    def __init__(self) -> None:
        self.commits = 0
        self.rollbacks = 0

    def commit(self) -> None:
        self.commits += 1

    def rollback(self) -> None:
        self.rollbacks += 1


class FakeWorkspaceRepository:
    def __init__(self) -> None:
        self.workspaces: dict[UUID, WorkspaceSummary] = {}

    def list_visible_to(self, _user_id: UUID) -> list[WorkspaceSummary]:
        return list(self.workspaces.values())

    def get(self, workspace_id: UUID) -> WorkspaceSummary | None:
        return self.workspaces.get(workspace_id)

    def get_active_grant(self, _workspace_id: UUID, _user_id: UUID) -> None:
        return None


class FakeWorkspaceCommands:
    def __init__(self, workspaces: FakeWorkspaceRepository) -> None:
        self.workspaces = workspaces
        self.customers: dict[UUID, WorkspaceCustomer] = {}
        self.grants: dict[tuple[UUID, UUID], WorkspaceGrant] = {}
        self.audit_events: list[dict[str, object]] = []
        self.creation_requests: dict[tuple[UUID, str], tuple[str, dict]] = {}

    def get_creation_request(self, actor_id: UUID, key: str):
        return self.creation_requests.get((actor_id, key))

    def add_creation_request(self, actor_id: UUID, key: str, fingerprint: str, payload: dict):
        self.creation_requests[(actor_id, key)] = (fingerprint, payload)

    def get_workspace_state_for_update(self, workspace_id: UUID):
        workspace = self.workspaces.get(workspace_id)
        return (workspace.revision, workspace.record_status) if workspace else None

    def update_workspace_revision(
        self, workspace_id: UUID, revision: int, updated_at: datetime
    ) -> None:
        workspace = self.workspaces.get(workspace_id)
        self.workspaces.workspaces[workspace_id] = replace(
            workspace, revision=revision, updated_at=updated_at
        )

    def add_customer(self, customer: WorkspaceCustomer, _created_by: UUID) -> None:
        self.customers[customer.id] = customer

    def add_workspace(self, workspace: WorkspaceSummary, _created_by: UUID) -> None:
        self.workspaces.workspaces[workspace.id] = workspace

    def add_membership(self, user_id: UUID, grant: WorkspaceGrant) -> None:
        self.grants[(grant.workspace_id, user_id)] = grant

    def get_active_grant(self, workspace_id: UUID, user_id: UUID) -> WorkspaceGrant | None:
        return self.grants.get((workspace_id, user_id))

    def add_audit_event(self, **event: object) -> None:
        self.audit_events.append(event)


class FakeReviewAccessRepository:
    def __init__(self) -> None:
        self.links: dict[UUID, WorkspaceReviewLink] = {}
        self.sessions: dict[str, WorkspaceGuestSession] = {}

    def add_link(self, link: WorkspaceReviewLink) -> None:
        self.links[link.id] = link

    def get_link(self, link_id: UUID) -> WorkspaceReviewLink | None:
        return self.links.get(link_id)

    def get_active_link(self, workspace_id: UUID) -> WorkspaceReviewLink | None:
        return self.get_active_link_for_update(workspace_id)

    def get_active_link_for_update(self, workspace_id: UUID) -> WorkspaceReviewLink | None:
        return next(
            (
                link
                for link in self.links.values()
                if link.workspace_id == workspace_id and link.status == ReviewLinkStatus.ACTIVE
            ),
            None,
        )

    def disable_link(
        self,
        link_id: UUID,
        *,
        disabled_by: UUID,
        disabled_at: datetime,
        reason: str,
        replaced_by_link_id: UUID | None = None,
    ) -> None:
        self.links[link_id] = replace(
            self.links[link_id],
            status=ReviewLinkStatus.DISABLED,
            disabled_by=disabled_by,
            disabled_at=disabled_at,
            disabled_reason=reason,
            replaced_by_link_id=replaced_by_link_id,
        )

    def set_replacement(self, link_id: UUID, replacement_link_id: UUID) -> None:
        self.links[link_id] = replace(
            self.links[link_id], replaced_by_link_id=replacement_link_id
        )

    def revoke_sessions_for_link(self, link_id: UUID, revoked_at: datetime) -> int:
        revoked = 0
        for token_hash, session in list(self.sessions.items()):
            if session.review_link_id == link_id and session.status == GuestSessionStatus.ACTIVE:
                self.sessions[token_hash] = replace(
                    session, status=GuestSessionStatus.REVOKED, revoked_at=revoked_at
                )
                revoked += 1
        return revoked

    def add_guest_session(self, session: WorkspaceGuestSession) -> None:
        self.sessions[session.token_hash] = session

    def get_guest_session_by_token_hash(
        self, token_hash: str
    ) -> WorkspaceGuestSession | None:
        return self.sessions.get(token_hash)


class ReviewAccessTests(unittest.TestCase):
    def setUp(self) -> None:
        self.actor = CurrentActor(
            id=uuid4(),
            email="designer@example.com",
            display_name="Designer",
            system_role=SystemRole.DESIGNER,
        )
        self.workspaces = FakeWorkspaceRepository()
        self.commands = FakeWorkspaceCommands(self.workspaces)
        self.review_access = FakeReviewAccessRepository()
        self.uow = FakeUnitOfWork()
        self.link_codec = HmacReviewLinkTokenCodec("test-review-secret-with-at-least-32-bytes")
        self.session_tokens = OpaqueGuestSessionTokenService()

    def create_workspace(self, key: str = "create-default"):
        return CreateWorkspace(
            self.commands,
            self.review_access,
            self.link_codec,
            self.uow,
            "https://proofprint.example",
        ).execute(
            actor=self.actor,
            customer_name="Công ty Ánh Dương",
            customer_email="contact@example.com",
            customer_phone="0901234567",
            product_type="apparel",
            idempotency_key=key,
        )

    def test_create_workspace_also_creates_fixed_signed_review_link(self) -> None:
        created = self.create_workspace()
        token = created.review_link.review_url.rsplit("/", maxsplit=1)[1]

        self.assertEqual(created.workspace.workflow_status, "DRAFT")
        self.assertEqual(created.workspace.customer_name, "Công ty Ánh Dương")
        self.assertIn(created.workspace.customer_id, self.commands.customers)
        self.assertEqual(created.review_link.link.version, 1)
        self.assertTrue(self.link_codec.verify(token, created.review_link.link))
        self.assertIn((created.workspace.id, self.actor.id), self.commands.grants)
        self.assertEqual(self.uow.commits, 1)

    def test_guest_username_creates_scoped_session_and_rotate_revokes_it(self) -> None:
        created = self.create_workspace()
        old_token = created.review_link.review_url.rsplit("/", maxsplit=1)[1]
        create_session = CreateGuestSession(
            self.review_access,
            self.workspaces,
            self.commands,
            self.link_codec,
            self.session_tokens,
            self.uow,
            24,
        )
        guest_session = create_session.execute(
            review_token=old_token, username="  Khách   hàng A  "
        )
        resolver = ResolveGuestSession(self.review_access, self.session_tokens)
        self.assertEqual(guest_session.principal.username, "Khách hàng A")
        self.assertEqual(
            resolver.execute(guest_session.raw_session_token).workspace_id,
            created.workspace.id,
        )

        replacement, revision = RotateReviewLink(
            self.commands,
            self.review_access,
            self.link_codec,
            self.uow,
            "https://proofprint.example",
        ).execute(self.actor, created.workspace.id, "Link was exposed", 0)

        self.assertEqual(replacement.link.version, 2)
        self.assertEqual(revision, 1)
        with self.assertRaises(AuthenticationRequired):
            resolver.execute(guest_session.raw_session_token)
        with self.assertRaises(ResourceNotFound):
            create_session.execute(review_token=old_token, username="Khách hàng A")

    def test_admin_cannot_create_or_manage_a_workspace(self) -> None:
        admin = CurrentActor(
            id=uuid4(),
            email="admin@example.com",
            display_name="Admin",
            system_role=SystemRole.ADMIN,
        )
        create = CreateWorkspace(
            self.commands,
            self.review_access,
            self.link_codec,
            self.uow,
            "https://proofprint.example",
        )
        with self.assertRaises(PermissionDenied):
            create.execute(
                actor=admin,
                customer_name="Customer",
                customer_email=None,
                customer_phone=None,
                product_type="apparel",
                idempotency_key="admin-attempt",
            )

    def test_create_workspace_replay_and_conflicting_key(self) -> None:
        created = self.create_workspace("same-key")
        replay = self.create_workspace("same-key")
        self.assertEqual(replay, created)
        self.assertEqual(len(self.commands.customers), 1)
        self.assertEqual(self.uow.commits, 1)
        self.assertEqual(
            [event["event_type"] for event in self.commands.audit_events],
            ["WORKSPACE_CREATED", "MEMBER_ADDED", "REVIEW_LINK_CREATED"],
        )
        with self.assertRaises(Conflict):
            CreateWorkspace(
                self.commands, self.review_access, self.link_codec, self.uow,
                "https://proofprint.example",
            ).execute(
                actor=self.actor, customer_name="Different", customer_email=None,
                customer_phone=None, product_type="apparel", idempotency_key="same-key",
            )

    def test_review_link_rotation_requires_current_revision(self) -> None:
        created = self.create_workspace()
        rotate = RotateReviewLink(
            self.commands, self.review_access, self.link_codec, self.uow,
            "https://proofprint.example",
        )
        disable = DisableReviewLink(
            self.commands, self.review_access, self.link_codec, self.uow,
            "https://proofprint.example",
        )
        rotate.execute(self.actor, created.workspace.id, "Rotate link", 0)
        with self.assertRaises(PreconditionFailed):
            disable.execute(self.actor, created.workspace.id, "Disable link", 0)


if __name__ == "__main__":
    unittest.main()
