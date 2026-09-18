import unittest

from sqlalchemy import ForeignKeyConstraint, UniqueConstraint

from proofprint.infrastructure.models import Base


class DatabaseSchemaTests(unittest.TestCase):
    def test_domain_contract_tables_are_registered(self) -> None:
        expected = {
            "users",
            "user_credentials",
            "customers",
            "customer_users",
            "designer_customer_assignments",
            "workspace_memberships",
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


if __name__ == "__main__":
    unittest.main()
