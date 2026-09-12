from typing import Protocol
from uuid import UUID

from proofprint.domain.entities import OrderWorkspace


class OrderRepository(Protocol):
    def get(self, order_id: UUID) -> OrderWorkspace | None: ...

    def save(self, order: OrderWorkspace) -> None: ...
