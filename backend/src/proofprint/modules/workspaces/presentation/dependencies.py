from typing import Annotated

from fastapi import Depends
from sqlalchemy.orm import Session

from proofprint.infrastructure.database import get_session
from proofprint.modules.workspaces.application import WorkspaceQueryService
from proofprint.modules.workspaces.infrastructure import SqlAlchemyWorkspaceAccessRepository


def get_workspace_query_service(
    session: Annotated[Session, Depends(get_session)],
) -> WorkspaceQueryService:
    return WorkspaceQueryService(SqlAlchemyWorkspaceAccessRepository(session))


WorkspaceQueryDep = Annotated[WorkspaceQueryService, Depends(get_workspace_query_service)]
