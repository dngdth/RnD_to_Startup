from fastapi import APIRouter

from proofprint.presentation.api.routers import authentication, workspaces

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(authentication.router)
api_router.include_router(workspaces.router)

__all__ = ["api_router"]
