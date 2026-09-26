from datetime import UTC, datetime
from uuid import UUID, uuid4

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from proofprint.domain.entities.zalo import ZaloBinding, ZaloLinkToken, ZaloPrincipalType
from proofprint.domain.exceptions import Conflict
from proofprint.infrastructure.models.zalo_bot import ZaloBotBindingRow, ZaloLinkTokenRow


class SqlAlchemyZaloLinkRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def get_user_binding(self, user_id: UUID) -> ZaloBinding | None:
        row = self.session.scalar(
            select(ZaloBotBindingRow).where(ZaloBotBindingRow.user_id == user_id)
        )
        return self._binding(row) if row else None

    def get_customer_binding(self, customer_id: UUID) -> ZaloBinding | None:
        row = self.session.scalar(
            select(ZaloBotBindingRow).where(ZaloBotBindingRow.customer_id == customer_id)
        )
        return self._binding(row) if row else None

    def get_binding_by_chat_id(self, chat_id: str) -> ZaloBinding | None:
        row = self.session.scalar(
            select(ZaloBotBindingRow).where(ZaloBotBindingRow.chat_id == chat_id)
        )
        return self._binding(row) if row else None

    def revoke_user_binding(self, user_id: UUID) -> None:
        row = self.session.scalar(
            select(ZaloBotBindingRow).where(ZaloBotBindingRow.user_id == user_id)
        )
        if row:
            self.session.delete(row)

    def revoke_customer_binding(self, customer_id: UUID) -> None:
        row = self.session.scalar(
            select(ZaloBotBindingRow).where(ZaloBotBindingRow.customer_id == customer_id)
        )
        if row:
            self.session.delete(row)

    def invalidate_user_tokens(self, user_id: UUID) -> None:
        self._invalidate(ZaloLinkTokenRow.user_id == user_id)

    def invalidate_customer_tokens(self, customer_id: UUID) -> None:
        self._invalidate(ZaloLinkTokenRow.customer_id == customer_id)

    def _invalidate(self, predicate: object) -> None:
        self.session.execute(
            update(ZaloLinkTokenRow)
            .where(predicate, ZaloLinkTokenRow.consumed_at.is_(None))
            .values(consumed_at=datetime.now(UTC))
        )

    def add_token(self, token: ZaloLinkToken) -> None:
        self.session.add(
            ZaloLinkTokenRow(
                id=token.id,
                principal_type=token.principal_type.value,
                user_id=token.user_id,
                customer_id=token.customer_id,
                token_hash=token.token_hash,
                expires_at=token.expires_at,
                consumed_at=token.consumed_at,
                created_by=token.created_by,
                created_at=token.created_at,
            )
        )

    def get_token_for_update(self, token_hash: str) -> ZaloLinkToken | None:
        row = self.session.scalar(
            select(ZaloLinkTokenRow)
            .where(ZaloLinkTokenRow.token_hash == token_hash)
            .with_for_update()
        )
        return self._token(row) if row else None

    def bind_token(
        self,
        token: ZaloLinkToken,
        *,
        chat_id: str,
        display_name: str | None,
    ) -> ZaloBinding:
        token_row = self.session.get(ZaloLinkTokenRow, token.id)
        if token_row is None:
            raise Conflict("Mã liên kết không còn tồn tại")
        existing_chat = self.session.scalar(
            select(ZaloBotBindingRow).where(ZaloBotBindingRow.chat_id == chat_id)
        )
        is_same_principal = existing_chat is not None and (
            (token.user_id is not None and existing_chat.user_id == token.user_id)
            or (
                token.customer_id is not None
                and existing_chat.customer_id == token.customer_id
            )
        )
        if existing_chat is not None and not is_same_principal:
            raise Conflict("Tài khoản Zalo này đã liên kết với người dùng khác")

        if token.user_id is not None:
            binding = self.session.scalar(
                select(ZaloBotBindingRow).where(
                    ZaloBotBindingRow.user_id == token.user_id
                )
            )
        else:
            binding = self.session.scalar(
                select(ZaloBotBindingRow).where(
                    ZaloBotBindingRow.customer_id == token.customer_id
                )
            )
        now = datetime.now(UTC)
        if binding is None:
            binding = ZaloBotBindingRow(
                id=uuid4(),
                user_id=token.user_id,
                customer_id=token.customer_id,
                chat_id=chat_id,
                zalo_display_name=display_name,
                created_at=now,
                updated_at=now,
            )
            self.session.add(binding)
        else:
            binding.chat_id = chat_id
            binding.zalo_display_name = display_name
            binding.updated_at = now
        token_row.consumed_at = now
        self.session.flush()
        return self._binding(binding)

    @staticmethod
    def _binding(row: ZaloBotBindingRow) -> ZaloBinding:
        return ZaloBinding(
            id=row.id,
            user_id=row.user_id,
            customer_id=row.customer_id,
            chat_id=row.chat_id,
            zalo_display_name=row.zalo_display_name,
            created_at=row.created_at,
            updated_at=row.updated_at,
        )

    @staticmethod
    def _token(row: ZaloLinkTokenRow) -> ZaloLinkToken:
        return ZaloLinkToken(
            id=row.id,
            principal_type=ZaloPrincipalType(row.principal_type),
            user_id=row.user_id,
            customer_id=row.customer_id,
            token_hash=row.token_hash,
            expires_at=row.expires_at,
            consumed_at=row.consumed_at,
            created_by=row.created_by,
            created_at=row.created_at,
        )
