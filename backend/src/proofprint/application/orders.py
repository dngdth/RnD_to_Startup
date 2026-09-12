from uuid import UUID

from proofprint.domain.entities import OrderWorkspace, SpecificationVersion
from proofprint.domain.errors import InvalidState, OrderNotFound, VersionNotFound
from proofprint.domain.repositories import OrderRepository


class OrderService:
    def __init__(self, orders: OrderRepository) -> None:
        self.orders = orders

    def create(self, *, customer_id: UUID, product_type: str) -> OrderWorkspace:
        order = OrderWorkspace.create(customer_id=customer_id, product_type=product_type)
        self.orders.save(order)
        return order

    def get(self, order_id: UUID) -> OrderWorkspace:
        order = self.orders.get(order_id)
        if order is None:
            raise OrderNotFound(f"Order {order_id} was not found")
        return order

    def get_version(self, *, order_id: UUID, version_id: UUID) -> SpecificationVersion:
        order = self.get(order_id)
        for version in order.versions:
            if version.id == version_id:
                return version
        raise VersionNotFound(f"Version {version_id} was not found in order {order_id}")

    def get_production_snapshot(self, order_id: UUID) -> SpecificationVersion:
        order = self.get(order_id)
        if order.production_version_id is None:
            raise InvalidState("Order has no production snapshot yet")
        for version in order.versions:
            if version.id == order.production_version_id:
                return version
        raise VersionNotFound(f"Production version was not found in order {order_id}")

    def put_block(
        self,
        *,
        order_id: UUID,
        block_id: UUID,
        block_type: str,
        label: str,
        content: dict,
        position: int,
    ) -> OrderWorkspace:
        order = self.get(order_id)
        order.put_block(
            block_id=block_id,
            block_type=block_type,
            label=label,
            content=content,
            position=position,
        )
        self.orders.save(order)
        return order

    def publish_version(self, order_id: UUID) -> SpecificationVersion:
        order = self.get(order_id)
        version = order.publish_version()
        self.orders.save(order)
        return version

    def approve(self, *, order_id: UUID, version_id: UUID, approver_id: UUID) -> OrderWorkspace:
        order = self.get(order_id)
        order.approve(version_id=version_id, approver_id=approver_id)
        self.orders.save(order)
        return order

    def lock_for_production(self, order_id: UUID) -> OrderWorkspace:
        order = self.get(order_id)
        order.lock_for_production()
        self.orders.save(order)
        return order
