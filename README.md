# færdigheder

Small, composable skills for real work.

This repository is intentionally lightweight: each skill should be easy to read,
easy to adapt, and easy to package. The repo also carries a small amount of
shared agent context so the skills live inside a coherent system instead of a
bag of unrelated markdown files.

## Installation

Install a single skill:

```sh
pnpm dlx skills add tedlindholm/faerdigheder -s british-spelling
```

Install all skills from this repo:

```sh
pnpm dlx skills add tedlindholm/faerdigheder --all
```

## Quickstart

Use the local helper scripts:

- `scripts/init_skill.py` — scaffold a new skill
- `scripts/quick_validate.py` — validate a skill's frontmatter and structure

The repo-level setup for agents lives in:

- `AGENTS.md`
- `CONTEXT.md`

## Why this repo exists

Big agent workflows can be useful, but they can also become brittle and hard to
adapt. `færdigheder` takes the opposite approach:

- small skills
- explicit supporting docs
- local-first setup
- simple packaging

Hack around with it. Make it your own.

## Repository layout

```text
.
├── AGENTS.md
├── CONTEXT.md
├── scripts/
└── skills/
    ├── british-spelling/
    └── skill-creator/
```

## Reference

- `british-spelling` — Enforce British English spelling in project-owned text without rewriting third-party identifiers.
- `skill-creator` — Create and refine reusable skills with strong frontmatter, concise instructions, and supporting references where needed.

## Conventions

- Skill names use kebab-case.
- `SKILL.md` requires frontmatter with `name` and `description`.
- Keep main skill files short and action-oriented.
- Move deep detail into `references/`.
