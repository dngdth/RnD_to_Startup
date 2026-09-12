from typing import Annotated

from fastapi import Depends, FastAPI
from sqlalchemy.orm import Session

from proofprint.application.orders import OrderService
from proofprint.domain.errors import DomainError
from proofprint.infrastructure.database import get_session
from proofprint.infrastructure.order_repository import SqlAlchemyOrderRepository
from proofprint.presentation.api import handle_domain_error, router
from proofprint.presentation.dependencies import get_order_service


def provide_order_service(session: Annotated[Session, Depends(get_session)]) -> OrderService:
    return OrderService(SqlAlchemyOrderRepository(session))


def create_app() -> FastAPI:
    app = FastAPI(title="ProofPrint API", version="0.1.0")
    app.include_router(router)
    app.add_exception_handler(DomainError, handle_domain_error)
    app.dependency_overrides[get_order_service] = provide_order_service
    return app


app = create_app()

__all__ = ["app"]
