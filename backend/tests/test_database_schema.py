import unittest

from sqlalchemy import CheckConstraint, ForeignKeyConstraint, UniqueConstraint

from proofprint.infrastructure.models import Base


class DatabaseSchemaTests(unittest.TestCase):
    def test_domain_contract_tables_are_registered(self) -> None:
        expected = {
            "users",
            "user_credentials",
            "customers",
            "guest_version_views",
            "idempotency_records",
            "workspace_memberships",
            "workspace_review_links",
            "workspace_guest_sessions",
            "order_workspaces",
            "specification_blocks",
            "specification_versions",
            "review_rounds",
            "approvals",
            "change_requests",
            "comments",
            "assets",
            "audit_events",
            "outbox_messages",
        }
        self.assertEqual(set(Base.metadata.tables), expected)

    def test_workspace_has_separate_workflow_and_record_state(self) -> None:
        columns = set(Base.metadata.tables["order_workspaces"].columns.keys())
        self.assertTrue(
            {
                "workflow_status",
                "record_status",
                "latest_version_id",
                "approved_version_id",
                "production_version_id",
                "revision",
            }.issubset(columns)
        )
        self.assertNotIn("status", columns)

    def test_customer_is_created_by_designer_with_optional_contact(self) -> None:
        columns = set(Base.metadata.tables["customers"].columns.keys())
        self.assertTrue({"name", "email", "phone", "created_by"}.issubset(columns))

    def test_guest_session_uses_username_instead_of_email(self) -> None:
        columns = set(Base.metadata.tables["workspace_guest_sessions"].columns.keys())
        self.assertIn("username", columns)
        self.assertNotIn("email", columns)

    def test_workspace_memberships_only_allow_designers(self) -> None:
        memberships = Base.metadata.tables["workspace_memberships"]
        constraint = next(
            item
            for item in memberships.constraints
            if isinstance(item, CheckConstraint)
            and item.name == "ck_workspace_memberships_role"
        )
        self.assertEqual(str(constraint.sqltext), "role = 'DESIGNER'")

    def test_credentials_are_separate_from_user_profile(self) -> None:
        user_columns = set(Base.metadata.tables["users"].columns.keys())
        credential_columns = set(Base.metadata.tables["user_credentials"].columns.keys())

        self.assertNotIn("password_hash", user_columns)
        self.assertIn("password_hash", credential_columns)
        self.assertNotIn("password", credential_columns)

    def test_approval_is_unique_per_version(self) -> None:
        approval = Base.metadata.tables["approvals"]
        unique_columns = {
            tuple(constraint.columns.keys())
            for constraint in approval.constraints
            if isinstance(constraint, UniqueConstraint)
        }
        self.assertIn(("version_id",), unique_columns)

    def test_only_one_open_review_round_is_enforced(self) -> None:
        review = Base.metadata.tables["review_rounds"]
        index = next(
            item for item in review.indexes if item.name == "uq_review_rounds_one_open_per_workspace"
        )
        self.assertTrue(index.unique)
        self.assertEqual(tuple(index.columns.keys()), ("workspace_id",))
        self.assertIn("status = 'OPEN'", str(index.dialect_options["postgresql"]["where"]))

    def test_version_references_are_scoped_to_the_same_workspace(self) -> None:
        workspace = Base.metadata.tables["order_workspaces"]
        composite_foreign_keys = {
            tuple(constraint.columns.keys())
            for constraint in workspace.constraints
            if isinstance(constraint, ForeignKeyConstraint)
        }
        self.assertIn(("approved_version_id", "id"), composite_foreign_keys)
        self.assertIn(("production_version_id", "id"), composite_foreign_keys)

    def test_only_one_active_review_link_is_enforced(self) -> None:
        links = Base.metadata.tables["workspace_review_links"]
        index = next(
            item for item in links.indexes if item.name == "uq_workspace_review_links_one_active"
        )
        self.assertTrue(index.unique)
        self.assertEqual(tuple(index.columns.keys()), ("workspace_id",))
        self.assertIn("status = 'ACTIVE'", str(index.dialect_options["postgresql"]["where"]))

    def test_guest_capable_records_require_exactly_one_actor(self) -> None:
        expected = {
            "approvals": "ck_approvals_exactly_one_actor",
            "comments": "ck_comments_exactly_one_actor",
            "change_requests": "ck_change_requests_exactly_one_requester",
            "audit_events": "ck_audit_events_exactly_one_actor",
            "idempotency_records": "ck_idempotency_records_exactly_one_actor",
        }
        for table_name, constraint_name in expected.items():
            constraints = {
                item.name
                for item in Base.metadata.tables[table_name].constraints
                if isinstance(item, CheckConstraint)
            }
            self.assertIn(constraint_name, constraints)

    def test_guest_idempotency_keys_are_scoped_to_guest_session(self) -> None:
        records = Base.metadata.tables["idempotency_records"]
        guest_index = next(
            item
            for item in records.indexes
            if item.name == "uq_idempotency_records_guest_scope_key"
        )
        self.assertTrue(guest_index.unique)
        self.assertEqual(
            tuple(guest_index.columns.keys()),
            ("guest_session_id", "workspace_id", "operation", "idempotency_key"),
        )
        self.assertIn(
            "guest_session_id IS NOT NULL",
            str(guest_index.dialect_options["postgresql"]["where"]),
        )

    def test_guest_version_view_is_scoped_to_same_workspace(self) -> None:
        views = Base.metadata.tables["guest_version_views"]
        foreign_keys = {
            item.name: tuple(item.columns.keys())
            for item in views.constraints
            if isinstance(item, ForeignKeyConstraint)
        }
        self.assertEqual(
            foreign_keys["fk_guest_version_views_version_same_workspace"],
            ("version_id", "workspace_id"),
        )
        self.assertEqual(
            tuple(column.name for column in views.primary_key.columns),
            ("guest_session_id", "version_id"),
        )

    def test_snapshot_block_references_do_not_target_mutable_draft_rows(self) -> None:
        for table_name in ("comments", "change_requests"):
            foreign_key_names = {
                item.name
                for item in Base.metadata.tables[table_name].constraints
                if isinstance(item, ForeignKeyConstraint)
            }
            self.assertNotIn(
                f"fk_{table_name}_block_same_workspace", foreign_key_names
            )


if __name__ == "__main__":
    unittest.main()
