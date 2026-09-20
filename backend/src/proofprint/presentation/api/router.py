from fastapi import APIRouter

from proofprint.presentation.api.routers import (
    admin,
    authentication,
    draft,
    guest,
    versions,
    workspaces,
)

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(admin.router)
api_router.include_router(authentication.router)
api_router.include_router(draft.router)
api_router.include_router(guest.router)
api_router.include_router(versions.router)
api_router.include_router(workspaces.router)

__all__ = ["api_router"]
