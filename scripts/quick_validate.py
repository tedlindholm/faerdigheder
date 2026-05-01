#!/usr/bin/env python3
"""
Quick validation for a skill directory.

Validates:
- SKILL.md exists
- YAML frontmatter exists
- Required keys: name, description
- Name format: kebab-case, <= 64 chars
"""

from __future__ import annotations

import re
import sys
from pathlib import Path
from typing import Dict, Tuple


ALLOWED_KEYS = {
    "name",
    "description",
    "license",
    "allowed-tools",
    "metadata",
    "compatibility",
}


def extract_frontmatter(text: str) -> Tuple[bool, str, str]:
    if not text.startswith("---\n"):
        return False, "", "No YAML frontmatter found"

    end_marker = "\n---\n"
    end_index = text.find(end_marker, 4)
    if end_index == -1:
        return False, "", "Invalid frontmatter format"

    frontmatter = text[4:end_index]
    body = text[end_index + len(end_marker):]
    return True, frontmatter, body


def parse_top_level_keys(frontmatter: str) -> Dict[str, str]:
    parsed: Dict[str, str] = {}
    lines = frontmatter.splitlines()
    current_key: str | None = None
    current_value_lines: list[str] = []

    for line in lines:
        if not line.strip():
            if current_key is not None:
                current_value_lines.append("")
            continue

        if line.startswith(" ") or line.startswith("\t"):
            if current_key is not None:
                current_value_lines.append(line)
            continue

        if ":" not in line:
            continue

        if current_key is not None:
            parsed[current_key] = "\n".join(current_value_lines).strip()

        key, value = line.split(":", 1)
        current_key = key.strip()
        current_value_lines = [value.strip()]

    if current_key is not None:
        parsed[current_key] = "\n".join(current_value_lines).strip()

    return parsed


def validate_skill(skill_path: Path) -> Tuple[bool, str]:
    skill_md = skill_path / "SKILL.md"
    if not skill_md.exists():
        return False, "SKILL.md not found"

    content = skill_md.read_text(encoding="utf-8")
    has_frontmatter, frontmatter, _ = extract_frontmatter(content)
    if not has_frontmatter:
        return False, "No YAML frontmatter found"

    fields = parse_top_level_keys(frontmatter)

    for key in fields:
        if key not in ALLOWED_KEYS:
            allowed = ", ".join(sorted(ALLOWED_KEYS))
            return False, f"Unexpected key '{key}'. Allowed keys: {allowed}"

    if "name" not in fields:
        return False, "Missing 'name' in frontmatter"
    if "description" not in fields:
        return False, "Missing 'description' in frontmatter"

    name = fields["name"].strip('"').strip("'").strip()
    if len(name) == 0:
        return False, "Name cannot be empty"
    if len(name) > 64:
        return False, "Name exceeds 64 characters"
    if not re.fullmatch(r"[a-z0-9-]+", name):
        return False, "Name must be kebab-case (lowercase letters, digits, hyphens)"
    if name.startswith("-") or name.endswith("-") or "--" in name:
        return False, "Name cannot start/end with hyphen or contain consecutive hyphens"

    description = fields["description"].strip()
    if len(description) == 0:
        return False, "Description cannot be empty"
    if "<" in description or ">" in description:
        return False, "Description cannot contain angle brackets"
    if len(description) > 1024:
        return False, "Description exceeds 1024 characters"

    return True, "Skill is valid"


def main() -> int:
    if len(sys.argv) != 2:
        print("Usage: scripts/quick_validate.py <path/to/skill>")
        return 1

    skill_path = Path(sys.argv[1]).resolve()
    if not skill_path.exists() or not skill_path.is_dir():
        print("Skill directory not found")
        return 1

    valid, message = validate_skill(skill_path)
    print(message)
    return 0 if valid else 1


if __name__ == "__main__":
    raise SystemExit(main())
