import unittest
from types import SimpleNamespace
from unittest.mock import Mock
from uuid import uuid4

from proofprint.application.use_cases.submit_customer_requests import SubmitCustomerRequests
from proofprint.domain.entities.version import ReviewRoundStatus
from proofprint.domain.exceptions import Conflict, ValidationFailed


class CustomerRequestBatchTests(unittest.TestCase):
    def setUp(self) -> None:
        self.workspace_id = uuid4()
        self.guest = SimpleNamespace(
            workspace_id=self.workspace_id, session_id=uuid4(), username="Khách hàng"
        )
        self.block_a, self.block_b = uuid4(), uuid4()
        self.collaboration = Mock()
        self.drafts = Mock()
        self.uow = Mock()
        self.workspace = SimpleNamespace(
            revision=4, record_status="ACTIVE", workflow_status="DRAFT",
            latest_version_id=None,
        )
        self.collaboration.get_workspace_for_update.return_value = self.workspace
        self.collaboration.get_guest_idempotent_result.return_value = None
        self.drafts.list_blocks.return_value = [
            SimpleNamespace(id=self.block_a), SimpleNamespace(id=self.block_b)
        ]
        self.use_case = SubmitCustomerRequests(self.collaboration, self.drafts, self.uow)

    def submit(self, items=None, version_id=None, key="batch-1"):
        return self.use_case.execute(
            guest=self.guest, workspace_id=self.workspace_id, version_id=version_id,
            items=items if items is not None else [
                (self.block_a, "Đổi màu"), (self.block_b, "Tăng số lượng")
            ],
            expected_revision=4, idempotency_key=key,
        )

    def test_draft_submits_two_block_requests_in_one_revision(self) -> None:
        result = self.submit()

        self.assertEqual(len(result["items"]), 2)
        self.assertEqual(result["workspace_revision"], 5)
        self.assertEqual(self.collaboration.add_comment.call_count, 2)
        comments = [call.args[0] for call in self.collaboration.add_comment.call_args_list]
        self.assertEqual({comment.block_id for comment in comments}, {self.block_a, self.block_b})
        self.assertEqual(str(comments[0].request_batch_id), result["batch_id"])
        self.assertEqual(len({comment.request_batch_id for comment in comments}), 1)
        self.assertIsNone(comments[0].version_id)
        self.collaboration.bump_workspace_revision.assert_called_once()
        self.uow.commit.assert_called_once()

    def test_rejects_unknown_block_before_writing(self) -> None:
        with self.assertRaises(ValidationFailed):
            self.submit(items=[(uuid4(), "Yêu cầu")])
        self.collaboration.add_comment.assert_not_called()
        self.uow.commit.assert_not_called()

    def test_blocks_without_a_message_are_not_submitted(self) -> None:
        result = self.submit(items=[(self.block_a, "Đổi màu")])

        self.assertEqual(len(result["items"]), 1)
        self.assertEqual(self.collaboration.add_comment.call_count, 1)
        self.assertEqual(self.collaboration.add_comment.call_args.args[0].block_id, self.block_a)

    def test_rejects_two_requests_for_same_block(self) -> None:
        with self.assertRaises(ValidationFailed):
            self.submit(items=[(self.block_a, "Một"), (self.block_a, "Hai")])
        self.uow.commit.assert_not_called()

    def test_replay_returns_original_batch_without_new_writes(self) -> None:
        first = self.submit()
        fingerprint = self.collaboration.add_guest_idempotent_result.call_args.kwargs[
            "request_fingerprint"
        ]
        self.collaboration.reset_mock()
        self.uow.reset_mock()
        self.collaboration.get_workspace_for_update.return_value = self.workspace
        self.collaboration.get_guest_idempotent_result.return_value = (fingerprint, first)

        replay = self.submit()

        self.assertEqual(replay, first)
        self.collaboration.add_comment.assert_not_called()
        self.uow.commit.assert_not_called()

    def test_replay_rejects_changed_payload(self) -> None:
        first = self.submit()
        fingerprint = self.collaboration.add_guest_idempotent_result.call_args.kwargs[
            "request_fingerprint"
        ]
        self.collaboration.get_guest_idempotent_result.return_value = (fingerprint, first)

        with self.assertRaises(Conflict):
            self.submit(items=[(self.block_a, "Khác")])

    def test_current_version_creates_change_requests_and_closes_round(self) -> None:
        version_id, round_id = uuid4(), uuid4()
        self.workspace.workflow_status = "IN_REVIEW"
        self.workspace.latest_version_id = version_id
        self.collaboration.get_version.return_value = SimpleNamespace(
            snapshot=[{"id": str(self.block_a)}, {"id": str(self.block_b)}]
        )
        self.collaboration.get_review_round_for_version.return_value = SimpleNamespace(
            id=round_id, status=ReviewRoundStatus.OPEN
        )

        result = self.submit(version_id=version_id)

        self.assertEqual(len(result["items"]), 2)
        self.assertEqual(self.collaboration.add_change_request.call_count, 2)
        self.collaboration.close_review_round_for_changes.assert_called_once()
        self.assertEqual(
            self.collaboration.bump_workspace_revision.call_args.kwargs["workflow_status"],
            "DRAFT",
        )
        self.uow.commit.assert_called_once()


if __name__ == "__main__":
    unittest.main()
