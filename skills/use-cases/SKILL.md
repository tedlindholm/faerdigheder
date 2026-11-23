---
name: use-cases
description: Write, tag and check granular use cases as Markdown files (one behaviour per file, UC-001-style IDs, tests that name the ID, SVG sketches for screens the project owns), with a checker that fails the test run when use cases and tests disagree. Use when asked to set up use cases in a repository, write, add, split, update or review a use case, take the next one from the work list, tag tests with a use case ID, draw a use case sketch, or draft a use case for behaviour not built yet.
---

# Use cases

A use case is **one behaviour**: given a starting point, when one thing happens, then one observable outcome. Each lives in its own file with an ID, and at least one test names that ID. A checker in the test run holds the two together in both directions. Use cases that show a screen the project owns have an SVG sketch.

Read [references/rules.md](references/rules.md) before writing one: size, Given/When/Then, sketches, tagging tests, and the work list.

## Set up in a repository

Do this once; skip it when the repository already has a use case folder.

1. **Pick the places** and confirm them with the user: the use case folder (default `Docs/use-cases`), the work list (default `Plans/USE_CASES.md`), and the test roots.
2. **Copy the assets:**
   - [assets/README.md](assets/README.md) → `<folder>/README.md`. Fill in the scope paragraph: whose behaviour the use cases describe, and which screens are the project's own (only those get sketches).
   - [assets/TEMPLATE.md](assets/TEMPLATE.md) and [assets/TEMPLATE.svg](assets/TEMPLATE.svg) → `<folder>/`. Replace the template's Area values with the project's areas.
   - [assets/USE_CASES.md](assets/USE_CASES.md) → the work list.
3. **Copy the checker:** [scripts/use-cases.mjs](scripts/use-cases.mjs) and [scripts/use-cases.test.ts](scripts/use-cases.test.ts) into the repository (for example `scripts/` and `tests/tooling/`). Set the constants at the top of the checker (`USE_CASES`, `TEST_ROOT`, `OWN_TESTS`) and the test's import path to match. Make sure the repository's test command runs the test. It needs Node 22 or later and Vitest; port it if the repository uses something else.
4. **Fill the work list** with behaviours that exist but are not written up, taken from the project's own docs.
5. **Run the test.** With no use cases it passes; it fails as soon as a test names an ID that has no use case.

## Write one

1. **Take the next row** from the work list, unless the user names one.
2. **Find the tests that already cover it** and grep for the example values in the docs it came from.
3. **Tag only what proves this behaviour.** Shared tables (`test.each`, loops, `[InlineData]` rows) usually cover several use cases, and the checker reads only literal titles. Move this behaviour's rows into their own tests with the ID in a literal title (`test("UC-007: …")`, or on a `describe`), or a new xUnit theory with `[Trait("UseCase", "UC-007")]`. Extract a helper rather than duplicate steps. Add boundary rows (a near miss) where the behaviour invites them.
4. **No test yet?** Write it first and watch it fail. If the behaviour already exists, show the test can fail by running it once with a wrong expectation.
5. **Run the checker.** It fails while a test names an ID with no use case: the expected red.
6. **Write the use case** from the template with the next free ID from the index. No owned screen: GUI *No*, and show the rule or input as text with a small table of outcomes. Owned screen: GUI *Yes* and a sketch.
7. **Update both lists:** add the index row and delete the work-list row. Edit them separately: the work-list text is often a substring of the index row, so a blind find-and-replace hits the wrong one.
8. **Run the checker, the suites holding the tagged tests, and the repository's lint and format checks.**

Behaviour not built yet is drafted in the work list without an ID, built test-first, and moved to the folder with an ID only when it is built and tested.

## Draw a sketch

1. **Look at the real screen first.** Run the app and take a screenshot (Playwright, browser tools) into a scratch folder. Delete any throwaway test afterwards.
2. **Draw a wireframe** from `TEMPLATE.svg`: grey boxes, the screen's real labels and values, one red dashed callout with a short note on what the use case is about. Use the same description for the SVG's `<title>` and the Markdown alt text.
3. **Render it and look:** `rsvg-convert -w 1200 sketch.svg -o out.png`, then view the PNG. Overflowing text is the usual fault; widen the canvas or wrap the line. `xmllint --noout sketch.svg` checks it is well formed.

## Notes

- Keep one emphasis style per Markdown file (`*x*` or `_x_`); markdownlint's MD049 flags a mix.
- Commit only when the user asks.
