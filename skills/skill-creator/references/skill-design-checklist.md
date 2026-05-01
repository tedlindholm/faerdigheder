# Skill design checklist

## Frontmatter

- `name` is kebab-case and matches directory name
- `description` states what the skill does
- `description` states when to use the skill

## Structure

- Keep `SKILL.md` focused on the core workflow
- Move lengthy reference material into `references/`
- Add scripts only when deterministic execution is required
- Prefer a shallow structure that is easy to package

## Reusability

- Include concrete examples of likely requests
- Capture constraints and edge cases
- Prefer simple, robust defaults
- Avoid time-sensitive or tool-specific assumptions when possible

## Packaging

- Validate the skill before packaging
- Package as a `.skill` archive
- Keep artefacts in `dist/`
