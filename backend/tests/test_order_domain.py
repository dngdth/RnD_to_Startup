import unittest
from uuid import uuid4

from proofprint.domain.entities import OrderStatus, OrderWorkspace
from proofprint.domain.errors import InvalidState, StaleVersion


class OrderWorkspaceTests(unittest.TestCase):
    def setUp(self) -> None:
        self.order = OrderWorkspace.create(customer_id=uuid4())
        self.block_id = uuid4()
        self.order.put_block(
            block_id=self.block_id,
            block_type="print_area",
            label="Back logo",
            content={"width_cm": 25, "height_cm": 18},
        )

    def test_published_version_is_detached_from_draft(self) -> None:
        first = self.order.publish_version()
        self.order.put_block(
            block_id=self.block_id,
            block_type="print_area",
            label="Back logo",
            content={"width_cm": 20, "height_cm": 15},
        )
        second = self.order.publish_version()

        self.assertEqual(first.snapshot[0]["content"]["width_cm"], 25)
        self.assertEqual(second.snapshot[0]["content"]["width_cm"], 20)
        self.assertEqual([first.number, second.number], [1, 2])

    def test_stale_version_cannot_be_approved(self) -> None:
        first = self.order.publish_version()
        self.order.put_block(
            block_id=self.block_id,
            block_type="print_area",
            label="Back logo",
            content={"width_cm": 20},
        )
        self.order.publish_version()

        with self.assertRaises(StaleVersion):
            self.order.approve(version_id=first.id, approver_id=uuid4())

    def test_production_lock_requires_approval_and_retains_history(self) -> None:
        first = self.order.publish_version()
        with self.assertRaises(InvalidState):
            self.order.lock_for_production()

        approval = self.order.approve(version_id=first.id, approver_id=uuid4())
        self.assertEqual(approval.version_id, first.id)
        self.order.lock_for_production()
        self.assertEqual(self.order.status, OrderStatus.LOCKED_FOR_PRODUCTION)

        self.order.put_block(
            block_id=self.block_id,
            block_type="print_area",
            label="Back logo",
            content={"width_cm": 20},
        )
        self.assertEqual(self.order.status, OrderStatus.DRAFT)
        self.assertEqual(self.order.production_version_id, first.id)
        self.assertEqual(self.order.versions[0].snapshot[0]["content"]["width_cm"], 25)

    def test_unchanged_specification_does_not_create_duplicate_version(self) -> None:
        self.order.publish_version()
        with self.assertRaises(InvalidState):
            self.order.publish_version()


if __name__ == "__main__":
    unittest.main()
