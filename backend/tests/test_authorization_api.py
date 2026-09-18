import unittest
from datetime import UTC, datetime
from uuid import UUID, uuid4

from fastapi.testclient import TestClient
from pwdlib import PasswordHash

from proofprint.core.errors import PermissionDenied, ResourceNotFound
from proofprint.main import create_app
from proofprint.modules.identity.application import AuthenticationService
from proofprint.modules.identity.domain import (
    AuthenticationRecord,
    SystemRole,
    UserStatus,
)
from proofprint.modules.identity.infrastructure import Argon2PasswordVerifier, JwtAccessTokenCodec
from proofprint.modules.identity.presentation.dependencies import get_authentication_service
from proofprint.modules.workspaces.application import WorkspaceQueryService
from proofprint.modules.workspaces.domain import WorkspaceGrant, WorkspaceSummary
from proofprint.modules.workspaces.presentation.dependencies import get_workspace_query_service
from tests.test_authentication import InMemoryAuthenticationRepository


class InMemoryWorkspaceAccessRepository:
    def __init__(
        self,
        workspaces: list[WorkspaceSummary],
        grants: list[tuple[UUID, WorkspaceGrant]],
    ) -> None:
        self.workspaces = {workspace.id: workspace for workspace in workspaces}
        self.grants = {(user_id, grant.workspace_id): grant for user_id, grant in grants}

    def list_all(self) -> list[WorkspaceSummary]:
        return list(self.workspaces.values())

    def list_visible_to(self, user_id: UUID) -> list[WorkspaceSummary]:
        return [
            workspace
            for workspace in self.workspaces.values()
            if (grant := self.grants.get((user_id, workspace.id))) is not None and grant.can_view
        ]

    def get(self, workspace_id: UUID) -> WorkspaceSummary | None:
        return self.workspaces.get(workspace_id)

    def get_active_grant(self, workspace_id: UUID, user_id: UUID) -> WorkspaceGrant | None:
        return self.grants.get((user_id, workspace_id))


class AuthorizationApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.password = "Designer-Password-123!"
        cls.designer_id = uuid4()
        cls.admin_id = uuid4()
        cls.designer = AuthenticationRecord(
            id=cls.designer_id,
            email="designer@example.com",
            display_name="Designer",
            system_role=SystemRole.DESIGNER,
            status=UserStatus.ACTIVE,
            password_hash=PasswordHash.recommended().hash(cls.password),
            must_change_password=False,
        )
        cls.admin = AuthenticationRecord(
            id=cls.admin_id,
            email="admin@example.com",
            display_name="Admin",
            system_role=SystemRole.ADMIN,
            status=UserStatus.ACTIVE,
            password_hash=PasswordHash.recommended().hash(cls.password),
            must_change_password=False,
        )
        cls.visible_workspace = cls.workspace()
        cls.hidden_workspace = cls.workspace()

    @staticmethod
    def workspace() -> WorkspaceSummary:
        return WorkspaceSummary(
            id=uuid4(),
            customer_id=uuid4(),
            product_type="apparel",
            workflow_status="DRAFT",
            record_status="ACTIVE",
            latest_version_id=None,
            approved_version_id=None,
            production_version_id=None,
            revision=0,
            updated_at=datetime.now(UTC),
        )

    def setUp(self) -> None:
        grant = WorkspaceGrant(
            workspace_id=self.visible_workspace.id,
            role=SystemRole.DESIGNER,
            can_view=True,
            can_edit=True,
            can_review=False,
            can_approve=False,
            can_lock_production=True,
        )
        self.repository = InMemoryWorkspaceAccessRepository(
            [self.visible_workspace, self.hidden_workspace], [(self.designer_id, grant)]
        )
        self.workspace_service = WorkspaceQueryService(self.repository)
        self.authentication = AuthenticationService(
            InMemoryAuthenticationRepository([self.designer, self.admin]),
            Argon2PasswordVerifier(),
            JwtAccessTokenCodec(
                secret_key="api-test-secret-key-with-at-least-32-bytes",
                issuer="api-test",
                ttl_minutes=30,
            ),
        )
        self.app = create_app()
        self.app.dependency_overrides[get_authentication_service] = lambda: self.authentication
        self.app.dependency_overrides[get_workspace_query_service] = lambda: self.workspace_service

    def login_headers(self, email: str = "designer@example.com") -> dict[str, str]:
        with TestClient(self.app) as client:
            response = client.post(
                "/api/v1/auth/login", json={"email": email, "password": self.password}
            )
        self.assertEqual(response.status_code, 200)
        return {"Authorization": f"Bearer {response.json()['access_token']}"}

    def test_authentication_and_current_actor_endpoint(self) -> None:
        with TestClient(self.app) as client:
            unauthenticated = client.get("/api/v1/auth/me")
            self.assertEqual(unauthenticated.status_code, 401)
            self.assertEqual(unauthenticated.headers["www-authenticate"], "Bearer")

            current = client.get("/api/v1/auth/me", headers=self.login_headers())
            self.assertEqual(current.status_code, 200)
            self.assertEqual(current.json()["id"], str(self.designer_id))
            self.assertEqual(current.json()["system_role"], "DESIGNER")

    def test_designer_only_sees_workspaces_in_active_membership_scope(self) -> None:
        headers = self.login_headers()
        with TestClient(self.app) as client:
            listing = client.get("/api/v1/workspaces", headers=headers)
            visible = client.get(
                f"/api/v1/workspaces/{self.visible_workspace.id}", headers=headers
            )
            hidden = client.get(
                f"/api/v1/workspaces/{self.hidden_workspace.id}", headers=headers
            )

        self.assertEqual(listing.status_code, 200)
        self.assertEqual([item["id"] for item in listing.json()], [str(self.visible_workspace.id)])
        self.assertEqual(visible.status_code, 200)
        self.assertTrue(visible.json()["permissions"]["can_edit"])
        self.assertEqual(hidden.status_code, 404)

    def test_admin_can_view_all_workspaces_without_membership(self) -> None:
        headers = self.login_headers("admin@example.com")
        with TestClient(self.app) as client:
            listing = client.get("/api/v1/workspaces", headers=headers)
            detail = client.get(
                f"/api/v1/workspaces/{self.hidden_workspace.id}", headers=headers
            )

        self.assertEqual(len(listing.json()), 2)
        self.assertEqual(detail.status_code, 200)
        self.assertEqual(detail.json()["permissions"]["role"], "ADMIN")

    def test_active_membership_without_view_permission_returns_403(self) -> None:
        denied = WorkspaceGrant(
            workspace_id=self.hidden_workspace.id,
            role=SystemRole.DESIGNER,
            can_view=False,
            can_edit=False,
            can_review=False,
            can_approve=False,
            can_lock_production=False,
        )
        self.repository.grants[(self.designer_id, self.hidden_workspace.id)] = denied

        with self.assertRaises(PermissionDenied):
            self.workspace_service.get_for(self.designer.as_actor(), self.hidden_workspace.id)
        headers = self.login_headers()
        with TestClient(self.app) as client:
            response = client.get(
                f"/api/v1/workspaces/{self.hidden_workspace.id}",
                headers=headers,
            )
        self.assertEqual(response.status_code, 403)

    def test_removed_order_api_is_not_exposed(self) -> None:
        with TestClient(self.app) as client:
            self.assertEqual(client.post("/api/v1/orders", json={}).status_code, 404)

    def test_unknown_workspace_is_hidden_as_not_found(self) -> None:
        with self.assertRaises(ResourceNotFound):
            self.workspace_service.get_for(self.designer.as_actor(), uuid4())


if __name__ == "__main__":
    unittest.main()
