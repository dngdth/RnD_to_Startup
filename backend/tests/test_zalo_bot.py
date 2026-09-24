import unittest
from datetime import UTC, datetime
from types import SimpleNamespace
from unittest.mock import patch
from urllib.error import URLError
from uuid import uuid4

from pydantic import SecretStr

from proofprint.infrastructure import zalo_bot
from proofprint.infrastructure.models.identity import CustomerRow, UserRow
from proofprint.infrastructure.models.review_access import WorkspaceReviewLinkRow
from proofprint.infrastructure.models.workspace import WorkspaceMembershipRow, WorkspaceRow
from proofprint.infrastructure.models.zalo_bot import ZaloBotBindingRow


class FakeSession:
    def __init__(self) -> None:
        self.workspace = SimpleNamespace(
            id=uuid4(), customer_id=uuid4(), created_by=uuid4(), product_type="Bao bì"
        )
        self.customer = SimpleNamespace(name="Khách hàng A", phone="+84 901 234 567")
        self.customer_binding = SimpleNamespace(chat_id="customer-chat")
        self.designer_binding = SimpleNamespace(chat_id="designer-chat")
        self.designer_status = "ACTIVE"
        self.link = SimpleNamespace(
            id=uuid4(), workspace_id=self.workspace.id, version=1,
            created_by=self.workspace.created_by, created_at=datetime.now(UTC),
        )

    def get(self, entity, _id):
        if entity is WorkspaceRow:
            return self.workspace
        if entity is CustomerRow:
            return self.customer
        if entity is UserRow:
            return SimpleNamespace(status=self.designer_status, system_role="DESIGNER")
        if entity is WorkspaceMembershipRow:
            return SimpleNamespace(status="ACTIVE", can_view=True)
        return None

    def scalar(self, query):
        entity = query.column_descriptions[0]["entity"]
        if entity is WorkspaceReviewLinkRow:
            return self.link
        if entity is ZaloBotBindingRow:
            # Customer and Designer are distinguished by the WHERE clause.
            return (
                self.customer_binding if "customer_phone" in str(query.whereclause)
                else self.designer_binding
            )
        return None


class ZaloBotTests(unittest.TestCase):
    def test_phone_normalization_and_private_updates(self) -> None:
        self.assertEqual(zalo_bot.normalize_phone("+84 901.234.567"), "0901234567")
        response = {"result": [
            {"message": {"chat": {"id": "private-id", "chat_type": "PRIVATE"},
                         "from": {"display_name": "A"}, "text": "secret text"}},
            {"message": {"chat": {"id": "group-id", "chat_type": "GROUP"}}},
        ]}
        self.assertEqual(zalo_bot._private_chat_updates(response), [("private-id", "A")])

    def test_notification_recipients_and_workspace_link(self) -> None:
        session = FakeSession()
        workspace_id = str(session.workspace.id)
        with patch.object(zalo_bot.settings, "review_base_url", "https://proofprint.example"):
            customer_chat, created = zalo_bot._message_for_event(
                session, "WORKSPACE_CREATED", {"workspace_id": workspace_id}
            )
            _, v1 = zalo_bot._message_for_event(
                session, "VERSION_RELEASED",
                {"workspace_id": workspace_id, "version_number": 1},
            )
            _, v2 = zalo_bot._message_for_event(
                session, "VERSION_RELEASED",
                {"workspace_id": workspace_id, "version_number": 2},
            )
            designer_chat, changes = zalo_bot._message_for_event(
                session, "REVIEW_CHANGES_REQUESTED", {"workspace_id": workspace_id}
            )
            batch_chat, batch_message = zalo_bot._message_for_event(
                session, "CUSTOMER_REQUEST_BATCH_SUBMITTED",
                {"workspace_id": workspace_id, "count": 2},
            )
        self.assertEqual(customer_chat, "customer-chat")
        self.assertEqual(designer_chat, "designer-chat")
        self.assertEqual(batch_chat, "designer-chat")
        self.assertIn("2 yêu cầu theo hạng mục", batch_message)
        self.assertIn("Version 1", v1)
        self.assertIn("Version 2", v2)
        self.assertIn("yêu cầu thay đổi", changes)
        self.assertEqual(created.splitlines()[-1], v1.splitlines()[-1])
        self.assertEqual(v1.splitlines()[-1], v2.splitlines()[-1])
        self.assertTrue(created.splitlines()[-1].startswith("https://"))
        self.assertEqual(
            changes.splitlines()[-1],
            f"https://proofprint.example/workspaces/{workspace_id}",
        )

    def test_missing_binding_fails_before_sending(self) -> None:
        session = FakeSession()
        session.customer_binding = None
        with self.assertRaisesRegex(RuntimeError, "no Zalo private-chat binding"):
            zalo_bot._message_for_event(
                session, "VERSION_RELEASED",
                {"workspace_id": str(session.workspace.id), "version_number": 1},
            )

    def test_disabled_designer_is_not_sent_customer_request(self) -> None:
        session = FakeSession()
        session.designer_status = "DISABLED"
        with self.assertRaises(zalo_bot.ZaloDesignerNoLongerActive):
            zalo_bot._message_for_event(
                session, "REVIEW_CHANGES_REQUESTED",
                {"workspace_id": str(session.workspace.id)},
            )

    def test_network_error_does_not_expose_bot_token(self) -> None:
        secret = "do-not-print-this-bot-token"
        with (
            patch.object(zalo_bot.settings, "zalo_bot_token", SecretStr(secret)),
            patch.object(zalo_bot, "urlopen", side_effect=URLError(secret)),
            self.assertRaises(RuntimeError) as context,
        ):
            zalo_bot._bot_request("sendMessage", {"chat_id": "chat", "text": "test"})
        self.assertNotIn(secret, str(context.exception))


if __name__ == "__main__":
    unittest.main()
