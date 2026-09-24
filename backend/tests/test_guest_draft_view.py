import unittest
from types import SimpleNamespace
from unittest.mock import Mock
from uuid import uuid4

from proofprint.application.use_cases.guest_access import GetGuestWorkspace
from proofprint.domain.exceptions import ResourceNotFound


class GuestDraftViewTests(unittest.TestCase):
    def setUp(self) -> None:
        self.workspace_id = uuid4()
        self.guest = SimpleNamespace(workspace_id=self.workspace_id)
        self.workspaces = Mock()
        self.drafts = Mock()
        self.use_case = GetGuestWorkspace(self.workspaces, self.drafts)

    def test_guest_reads_only_their_active_workspace_draft(self) -> None:
        self.workspaces.get.return_value = SimpleNamespace(
            id=self.workspace_id, record_status="ACTIVE", workflow_status="DRAFT"
        )
        block = SimpleNamespace(label="Màu sắc", content={"name": "xanh navy"})
        self.drafts.list_blocks.return_value = [block]

        self.assertEqual(self.use_case.draft_blocks(self.guest), [block])
        self.workspaces.get.assert_called_once_with(self.workspace_id)
        self.drafts.list_blocks.assert_called_once_with(self.workspace_id)

    def test_guest_does_not_read_draft_outside_draft_phase(self) -> None:
        self.workspaces.get.return_value = SimpleNamespace(
            id=self.workspace_id, record_status="ACTIVE", workflow_status="IN_REVIEW"
        )

        self.assertEqual(self.use_case.draft_blocks(self.guest), [])
        self.drafts.list_blocks.assert_not_called()

    def test_guest_cannot_read_cancelled_workspace_draft(self) -> None:
        self.workspaces.get.return_value = SimpleNamespace(
            id=self.workspace_id, record_status="CANCELLED", workflow_status="DRAFT"
        )

        with self.assertRaises(ResourceNotFound):
            self.use_case.draft_blocks(self.guest)
        self.drafts.list_blocks.assert_not_called()


if __name__ == "__main__":
    unittest.main()
