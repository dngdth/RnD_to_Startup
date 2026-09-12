from typing import Annotated

from fastapi import Depends

from proofprint.application.orders import OrderService


def get_order_service() -> OrderService:
    """Dependency contract; the application entry point supplies the implementation."""
    raise RuntimeError("OrderService dependency has not been configured")


ServiceDep = Annotated[OrderService, Depends(get_order_service)]
