from fastapi import APIRouter

from proofprint.presentation.api.routers import (
    admin,
    approval_production,
    authentication,
    collaboration,
    draft,
    guest,
    versions,
    workspace_lifecycle,
    workspaces,
    zalo_links,
)

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(admin.router)
api_router.include_router(approval_production.router)
api_router.include_router(authentication.router)
api_router.include_router(collaboration.router)
api_router.include_router(draft.router)
api_router.include_router(guest.router)
api_router.include_router(versions.router)
api_router.include_router(workspaces.router)
api_router.include_router(workspace_lifecycle.router)
api_router.include_router(zalo_links.router)

__all__ = ["api_router"]
