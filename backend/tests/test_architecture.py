import ast
import sys
import unittest
from pathlib import Path

PACKAGE_ROOT = Path(__file__).parents[1] / "src" / "proofprint"
FORBIDDEN_PACKAGES = {"fastapi", "pydantic", "sqlalchemy", "jwt", "pwdlib"}
STANDARD_LIBRARY = sys.stdlib_module_names


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
                    if (
                        root_package in FORBIDDEN_PACKAGES
                        or root_package not in STANDARD_LIBRARY | {"proofprint"}
                        or imported.startswith(forbidden_layers)
                    ):
                        violations.append(f"{source_file}: {imported}")

        self.assertEqual(violations, [], "Invalid inner-layer imports:\n" + "\n".join(violations))

    def test_public_use_cases_have_execute_method(self) -> None:
        violations: list[str] = []
        for source_file in (PACKAGE_ROOT / "application" / "use_cases").glob("*.py"):
            if source_file.name == "__init__.py":
                continue
            tree = ast.parse(source_file.read_text(encoding="utf-8"))
            for node in tree.body:
                if (
                    isinstance(node, ast.ClassDef)
                    and not node.name.startswith("_")
                    and not any(
                        isinstance(item, ast.FunctionDef) and item.name == "execute"
                        for item in node.body
                    )
                ):
                    violations.append(f"{source_file}: {node.name}")
        self.assertEqual(violations, [], "Use cases missing execute(): " + ", ".join(violations))


if __name__ == "__main__":
    unittest.main()
