from copy import deepcopy
from threading import RLock
from uuid import UUID

from proofprint.domain.entities import OrderWorkspace


class InMemoryOrderRepository:
    """Temporary storage for local API exploration without PostgreSQL."""

    def __init__(self) -> None:
        self._orders: dict[UUID, OrderWorkspace] = {}
        self._lock = RLock()

    def get(self, order_id: UUID) -> OrderWorkspace | None:
        with self._lock:
            order = self._orders.get(order_id)
            return deepcopy(order) if order is not None else None

    def save(self, order: OrderWorkspace) -> None:
        with self._lock:
            self._orders[order.id] = deepcopy(order)
