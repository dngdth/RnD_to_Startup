from fastapi import APIRouter

from proofprint.modules.identity.presentation.router import router as identity_router
from proofprint.modules.workspaces.presentation.router import router as workspaces_router

router = APIRouter(prefix="/api/v1")
router.include_router(identity_router)
router.include_router(workspaces_router)

__all__ = ["router"]
