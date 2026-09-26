from unittest.mock import patch

from fastapi.testclient import TestClient

from proofprint.main import create_app


def test_server_lifespan_starts_and_stops_embedded_zalo_workers() -> None:
    with patch("proofprint.main.EmbeddedZaloWorkers") as worker_factory:
        with TestClient(create_app(start_background_workers=True)):
            worker_factory.return_value.start.assert_called_once_with()

        worker_factory.return_value.stop.assert_called_once_with()


def test_regular_app_factory_does_not_start_background_workers() -> None:
    with patch("proofprint.main.EmbeddedZaloWorkers") as worker_factory:
        with TestClient(create_app()):
            pass

        worker_factory.assert_not_called()
