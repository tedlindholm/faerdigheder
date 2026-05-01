---
name: skill-creator
description: Create and refine reusable AI skills with clear frontmatter, trigger-focused instructions, and optional references or scripts. Use when authoring a new skill or tightening an existing one.
---

# Skill Creator

Design skills that are concise, reusable, and easy for an agent to trigger.

## What to do

1. Define the concrete user requests the skill should handle.
2. Decide whether the skill needs only instructions or also bundled references, scripts, or assets.
3. Write `SKILL.md` with strong frontmatter and a short action-oriented body.
4. Move deep detail into `references/` instead of bloating the main skill file.
5. Validate and package the skill before shipping it.

## Supporting info

- `description` should explain both capability and trigger conditions.
- Prefer deterministic scripts only when they improve reliability over prose.
- Keep terminology consistent between frontmatter, headings, and references.
- See `references/skill-design-checklist.md` for the review checklist.
