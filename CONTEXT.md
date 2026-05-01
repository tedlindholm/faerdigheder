# færdigheder context

## Purpose

`færdigheder` is a repository of reusable agent skills. Each skill is small, composable, and easy to adapt instead of locking users into one giant workflow.

## Glossary

- **skill** — A reusable capability packaged as a directory containing `SKILL.md` and optional supporting files.
- **frontmatter** — YAML metadata at the top of `SKILL.md`; currently `name` and `description` are required.
- **reference** — Detailed supporting documentation stored under `references/` when the main skill file should stay concise.
- **utility script** — Deterministic helper code in `scripts/` used when instructions alone would be repetitive or error-prone.
- **agent setup docs** — Repo-level instructions in `AGENTS.md` that explain how agents should work in this repository.

## Working norms

- Prefer tiny, composable skills over monolithic process bundles.
- Keep `SKILL.md` focused on action; move deep detail into `references/`.
- Prefer deterministic helper scripts only when they materially improve reliability.
- Keep terminology consistent across README, scripts, and skill docs.
