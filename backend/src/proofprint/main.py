from typing import Annotated

from fastapi import Depends, FastAPI
from sqlalchemy.orm import Session

from proofprint.application.orders import OrderService
from proofprint.domain.errors import DomainError
from proofprint.infrastructure.database import get_session, settings
from proofprint.infrastructure.memory_order_repository import InMemoryOrderRepository
from proofprint.infrastructure.order_repository import SqlAlchemyOrderRepository
from proofprint.presentation.api import handle_domain_error, router
from proofprint.presentation.dependencies import get_order_service


def provide_order_service(session: Annotated[Session, Depends(get_session)]) -> OrderService:
    return OrderService(SqlAlchemyOrderRepository(session))


def create_app(*, storage_backend: str | None = None) -> FastAPI:
    app = FastAPI(title="ProofPrint API", version="0.1.0")
    app.include_router(router)
    app.add_exception_handler(DomainError, handle_domain_error)
    backend = storage_backend or settings.storage_backend
    if backend == "postgres":
        app.dependency_overrides[get_order_service] = provide_order_service
    elif backend == "memory":
        repository = InMemoryOrderRepository()

        def provide_in_memory_order_service() -> OrderService:
            return OrderService(repository)

        app.dependency_overrides[get_order_service] = provide_in_memory_order_service
    else:
        raise ValueError(f"Unsupported storage backend: {backend}")
    return app


app = create_app()

__all__ = ["app"]
