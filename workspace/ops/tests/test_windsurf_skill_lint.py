#!/usr/bin/env python3
from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from workspace.ops.windsurf_skill_lint import lint_roots


class WindsurfSkillLintTests(unittest.TestCase):
    def test_valid_skill_frontmatter(self) -> None:
        with tempfile.TemporaryDirectory() as td:
            root = Path(td) / ".windsurf" / "skills"
            skill_dir = root / "alpha"
            skill_dir.mkdir(parents=True)
            (skill_dir / "SKILL.md").write_text(
                """---\nname: alpha\ndescription: Test skill\n---\n# Body\n""",
                encoding="utf-8",
            )
            report = lint_roots([root])
            self.assertEqual(report["checked_skills"], 1)
            self.assertEqual(report["error_count"], 0)

    def test_missing_required_field_fails(self) -> None:
        with tempfile.TemporaryDirectory() as td:
            root = Path(td) / ".windsurf" / "skills"
            skill_dir = root / "beta"
            skill_dir.mkdir(parents=True)
            (skill_dir / "SKILL.md").write_text(
                """---\nname: beta\n---\n# Body\n""",
                encoding="utf-8",
            )
            report = lint_roots([root])
            self.assertEqual(report["checked_skills"], 1)
            self.assertGreater(report["error_count"], 0)
            joined = "\n".join(report["errors"])
            self.assertIn("missing required frontmatter field 'description'", joined)


if __name__ == "__main__":
    unittest.main()
