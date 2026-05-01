#!/usr/bin/env python3
"""
Initialise a new skill directory.

Usage:
    scripts/init_skill.py <skill-name> --path <category-directory>
"""

from __future__ import annotations

import re
import sys
from pathlib import Path


SKILL_TEMPLATE = """---
name: {skill_name}
description: [TODO: Explain what the skill does and when to use it.]
---

# {title}

[TODO: Add a concise one-line summary.]

## What to do

1. [TODO]
2. [TODO]
3. [TODO]

## Supporting info

- Add detailed material to `references/` only when it helps keep this file concise.
"""


def title_case(skill_name: str) -> str:
    return " ".join(part.capitalize() for part in skill_name.split("-"))


def is_valid_skill_name(skill_name: str) -> bool:
    if len(skill_name) == 0 or len(skill_name) > 64:
        return False
    if not re.fullmatch(r"[a-z0-9-]+", skill_name):
        return False
    if skill_name.startswith("-") or skill_name.endswith("-") or "--" in skill_name:
        return False
    return True


def init_skill(skill_name: str, skills_root: Path) -> int:
    if not is_valid_skill_name(skill_name):
        print("❌ Invalid skill name. Use kebab-case (lowercase, digits, hyphens), max 64 chars.")
        return 1

    skill_dir = skills_root / skill_name
    if skill_dir.exists():
        print(f"❌ Skill already exists: {skill_dir}")
        return 1

    (skill_dir / "references").mkdir(parents=True)

    skill_md = skill_dir / "SKILL.md"
    skill_md.write_text(SKILL_TEMPLATE.format(skill_name=skill_name, title=title_case(skill_name)), encoding="utf-8")

    print(f"✅ Created skill at {skill_dir}")
    return 0


def main() -> int:
    if len(sys.argv) != 4 or sys.argv[2] != "--path":
        print("Usage: scripts/init_skill.py <skill-name> --path <category-directory>")
        return 1

    skill_name = sys.argv[1]
    skills_root = Path(sys.argv[3]).resolve()
    skills_root.mkdir(parents=True, exist_ok=True)
    return init_skill(skill_name, skills_root)


if __name__ == "__main__":
    raise SystemExit(main())
