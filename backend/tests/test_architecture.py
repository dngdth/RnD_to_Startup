import ast
import unittest
from pathlib import Path

PACKAGE_ROOT = Path(__file__).parents[1] / "src" / "proofprint"
FORBIDDEN_PACKAGES = {"fastapi", "pydantic", "sqlalchemy", "jwt", "pwdlib"}


def imported_modules(path: Path) -> set[str]:
    tree = ast.parse(path.read_text(encoding="utf-8"), filename=str(path))
    imports: set[str] = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            imports.update(alias.name for alias in node.names)
        elif isinstance(node, ast.ImportFrom) and node.module:
            imports.add(node.module)
    return imports


class CleanArchitectureTests(unittest.TestCase):
    def test_inner_layers_do_not_depend_on_frameworks_or_outer_layers(self) -> None:
        violations: list[str] = []

        rules = {
            "domain": ("proofprint.application", "proofprint.infrastructure", "proofprint.presentation"),
            "application": ("proofprint.infrastructure", "proofprint.presentation"),
        }
        for layer_name, forbidden_layers in rules.items():
            for source_file in (PACKAGE_ROOT / layer_name).rglob("*.py"):
                for imported in imported_modules(source_file):
                    root_package = imported.partition(".")[0]
                    if root_package in FORBIDDEN_PACKAGES or imported.startswith(
                        forbidden_layers
                    ):
                        violations.append(f"{source_file}: {imported}")

        self.assertEqual(violations, [], "Invalid inner-layer imports:\n" + "\n".join(violations))


if __name__ == "__main__":
    unittest.main()
