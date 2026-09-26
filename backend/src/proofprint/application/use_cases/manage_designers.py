from datetime import UTC, datetime
from uuid import UUID, uuid4

from proofprint.domain.entities.identity import (
    CurrentActor,
    DesignerAccount,
    SystemRole,
    UserStatus,
)
from proofprint.domain.exceptions import Conflict, PermissionDenied, ResourceNotFound
from proofprint.domain.interfaces.authentication import DesignerAccountRepository, PasswordHasher
from proofprint.domain.interfaces.review_access import UnitOfWork
from proofprint.domain.phone_numbers import normalize_vietnamese_phone


def _require_admin(actor: CurrentActor) -> None:
    if actor.system_role != SystemRole.ADMIN:
        raise PermissionDenied("Only an admin can manage designer accounts")


class ListDesigners:
    def __init__(self, designers: DesignerAccountRepository) -> None:
        self.designers = designers

    def execute(self, actor: CurrentActor) -> list[DesignerAccount]:
        _require_admin(actor)
        return self.designers.list_designers()


class CreateDesigner:
    def __init__(
        self, designers: DesignerAccountRepository, passwords: PasswordHasher,
        unit_of_work: UnitOfWork,
    ) -> None:
        self.designers = designers
        self.passwords = passwords
        self.unit_of_work = unit_of_work

    def execute(
        self, actor: CurrentActor, *, email: str, display_name: str,
        temporary_password: str, phone: str | None = None,
    ) -> DesignerAccount:
        _require_admin(actor)
        normalized_email = email.strip().lower()
        if self.designers.email_exists(normalized_email):
            raise Conflict("An account with this email already exists")
        normalized_phone = normalize_vietnamese_phone(phone) if phone else None
        if normalized_phone and self.designers.phone_exists(normalized_phone):
            raise Conflict("An account with this phone already exists")
        account = DesignerAccount(
            id=uuid4(), email=normalized_email, display_name=display_name.strip(),
            status=UserStatus.ACTIVE, must_change_password=True,
            created_at=datetime.now(UTC),
            phone=normalized_phone,
        )
        try:
            self.designers.add_designer(
                account, password_hash=self.passwords.hash(temporary_password)
            )
            self.unit_of_work.commit()
        except Exception:
            self.unit_of_work.rollback()
            raise
        return account


class SetDesignerStatus:
    def __init__(self, designers: DesignerAccountRepository, unit_of_work: UnitOfWork) -> None:
        self.designers = designers
        self.unit_of_work = unit_of_work

    def execute(
        self, actor: CurrentActor, designer_id: UUID, status: UserStatus
    ) -> DesignerAccount:
        _require_admin(actor)
        if self.designers.find_designer(designer_id) is None:
            raise ResourceNotFound("Designer account was not found")
        try:
            self.designers.set_designer_status(designer_id, status)
            self.unit_of_work.commit()
        except Exception:
            self.unit_of_work.rollback()
            raise
        updated = self.designers.find_designer(designer_id)
        if updated is None:
            raise ResourceNotFound("Designer account was not found")
        return updated


class ManageDesigners:
    def __init__(self, designers: DesignerAccountRepository, unit_of_work: UnitOfWork) -> None:
        self.designers = designers
        self.unit_of_work = unit_of_work

    def find(self, actor: CurrentActor, designer_id: UUID) -> DesignerAccount | None:
        _require_admin(actor)
        return self.designers.find_designer(designer_id)

    def execute(
        self,
        actor: CurrentActor,
        designer_id: UUID,
        *,
        display_name: str | None = None,
        email: str | None = None,
        phone: str | None = None,
    ) -> DesignerAccount:
        return self.update(
            actor,
            designer_id,
            display_name=display_name,
            email=email,
            phone=phone,
        )

    def update(
        self,
        actor: CurrentActor,
        designer_id: UUID,
        *,
        display_name: str | None = None,
        email: str | None = None,
        phone: str | None = None,
    ) -> DesignerAccount:
        _require_admin(actor)

        existing = self.designers.find_designer(designer_id)
        if existing is None:
            raise ResourceNotFound("Designer account was not found")

        normalized_email = None
        if email is not None:
            normalized_email = email.strip().lower()
            if (
                normalized_email != existing.email
                and self.designers.email_exists(normalized_email)
            ):
                raise Conflict("An account with this email already exists")

        normalized_phone = None
        if phone is not None:
            normalized_phone = normalize_vietnamese_phone(phone)
            if normalized_phone != existing.phone and self.designers.phone_exists(
                normalized_phone
            ):
                raise Conflict("An account with this phone already exists")

        try:
            changes: dict[str, str | None] = {
                "display_name": display_name.strip() if display_name is not None else None,
                "email": normalized_email,
            }
            if phone is not None:
                changes["phone"] = normalized_phone
            updated_account = self.designers.update_designer(designer_id, **changes)
            self.unit_of_work.commit()
        except Exception:
            self.unit_of_work.rollback()
            raise

        if updated_account is None:
            raise ResourceNotFound("Designer account was not found")
        return updated_account
