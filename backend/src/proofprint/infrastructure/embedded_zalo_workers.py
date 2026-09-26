"""Run the two Zalo workers inside the FastAPI server process."""

import logging
from collections.abc import Callable
from threading import Event, Thread

from proofprint.infrastructure.database import settings

Worker = Callable[[Event], None]
logger = logging.getLogger(__name__)


class EmbeddedZaloWorkers:
    """Own daemon threads for link-code polling and notification delivery."""

    def __init__(self) -> None:
        self._stop_event = Event()
        self._threads: list[Thread] = []

    @property
    def running(self) -> bool:
        return any(thread.is_alive() for thread in self._threads)

    def start(self) -> None:
        token = settings.zalo_bot_token
        if token is None or not token.get_secret_value():
            logger.info("Embedded Zalo workers disabled: ZALO_BOT_TOKEN is not configured")
            return
        if self.running:
            return

        from proofprint.infrastructure.outbox import run_outbox_worker
        from proofprint.infrastructure.zalo_bot import listen_for_link_codes

        self._stop_event.clear()
        workers: tuple[tuple[str, Worker], ...] = (
            ("proofprint-zalo-link-listener", listen_for_link_codes),
            (
                "proofprint-zalo-notification-worker",
                lambda stop: run_outbox_worker(channel="zalo", stop_event=stop),
            ),
        )
        self._threads = [
            Thread(
                target=self._run_worker,
                args=(name, worker),
                name=name,
                daemon=True,
            )
            for name, worker in workers
        ]
        for thread in self._threads:
            thread.start()
        logger.info("Started embedded Zalo link and notification workers")

    def stop(self) -> None:
        self._stop_event.set()
        for thread in self._threads:
            thread.join(timeout=1)
        self._threads.clear()
        logger.info("Stopped embedded Zalo workers")

    def _run_worker(self, name: str, worker: Worker) -> None:
        try:
            worker(self._stop_event)
        except Exception:
            logger.exception("Embedded Zalo worker %s stopped unexpectedly", name)
