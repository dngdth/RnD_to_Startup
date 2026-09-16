import unittest
from uuid import uuid4

from fastapi.testclient import TestClient

from proofprint.main import create_app


class OrderApiTests(unittest.TestCase):
    def setUp(self) -> None:
        self.app = create_app(storage_backend="memory")

    def test_order_routes_use_injected_service_and_preserve_workflow(self) -> None:
        with TestClient(self.app) as client:
            self.assertEqual(client.get("/health").json(), {"status": "ok"})

            created = client.post("/api/v1/orders", json={"customer_id": str(uuid4())})
            self.assertEqual(created.status_code, 201)
            order_id = created.json()["id"]

            block_id = uuid4()
            updated = client.put(
                f"/api/v1/orders/{order_id}/blocks/{block_id}",
                json={
                    "block_type": "print_area",
                    "label": "Back logo",
                    "content": {"width_cm": 25},
                },
            )
            self.assertEqual(updated.status_code, 200)
            self.assertEqual(updated.json()["blocks"][0]["id"], str(block_id))

            published = client.post(f"/api/v1/orders/{order_id}/versions")
            self.assertEqual(published.status_code, 201)
            version_id = published.json()["id"]

            version = client.get(f"/api/v1/orders/{order_id}/versions/{version_id}")
            self.assertEqual(version.status_code, 200)
            self.assertEqual(version.json()["snapshot"][0]["content"]["width_cm"], 25)

            approved = client.post(
                f"/api/v1/orders/{order_id}/versions/{version_id}/approve",
                json={"approver_id": str(uuid4())},
            )
            self.assertEqual(approved.status_code, 200)
            self.assertEqual(approved.json()["approved_version_id"], version_id)

            locked = client.post(f"/api/v1/orders/{order_id}/production-lock")
            self.assertEqual(locked.status_code, 200)
            self.assertEqual(locked.json()["production_version_id"], version_id)

            snapshot = client.get(f"/api/v1/orders/{order_id}/production-snapshot")
            self.assertEqual(snapshot.status_code, 200)
            self.assertEqual(snapshot.json()["id"], version_id)

    def test_domain_errors_still_map_to_http_status_codes(self) -> None:
        with TestClient(self.app) as client:
            missing = client.get(f"/api/v1/orders/{uuid4()}")
            self.assertEqual(missing.status_code, 404)

            created = client.post("/api/v1/orders", json={"customer_id": str(uuid4())})
            order_id = created.json()["id"]
            premature_lock = client.post(f"/api/v1/orders/{order_id}/production-lock")
            self.assertEqual(premature_lock.status_code, 409)

    def test_memory_storage_is_reset_with_a_new_app(self) -> None:
        with TestClient(self.app) as client:
            created = client.post("/api/v1/orders", json={"customer_id": str(uuid4())})
            self.assertEqual(created.status_code, 201)
            order_id = created.json()["id"]

        with TestClient(create_app(storage_backend="memory")) as fresh_client:
            self.assertEqual(fresh_client.get(f"/api/v1/orders/{order_id}").status_code, 404)
