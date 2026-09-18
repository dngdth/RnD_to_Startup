from typing import Protocol
from uuid import UUID

from proofprint.domain.identity import (
    AuthenticationRecord,
    IssuedAccessToken,
    WorkspaceGrant,
    WorkspaceSummary,
)


class AuthenticationRepository(Protocol):
    def find_by_email(self, email: str) -> AuthenticationRecord | None: ...

    def find_by_id(self, user_id: UUID) -> AuthenticationRecord | None: ...


class PasswordVerifier(Protocol):
    def verify(self, plain_password: str, password_hash: str) -> bool: ...


class AccessTokenCodec(Protocol):
    def issue(self, user_id: UUID) -> IssuedAccessToken: ...

    def decode_subject(self, token: str) -> UUID: ...


class WorkspaceAccessRepository(Protocol):
    def list_all(self) -> list[WorkspaceSummary]: ...

    def list_visible_to(self, user_id: UUID) -> list[WorkspaceSummary]: ...

    def get(self, workspace_id: UUID) -> WorkspaceSummary | None: ...

    def get_active_grant(self, workspace_id: UUID, user_id: UUID) -> WorkspaceGrant | None: ...
