---
name: use-cases
description: Write, tag and check granular use cases as Markdown files (one behaviour per file, UC-001-style IDs, tests that name the ID, SVG sketches for screens the project owns), with a checker that fails the test run when use cases and tests disagree. Use when asked to set up use cases in a repository, write, add, split, update or review a use case, take the next one from the work list, tag tests with a use case ID, draw a use case sketch, or draft a use case for behaviour not built yet.
---

# Use cases

A use case is **one behaviour**: given a starting point, when one thing happens, then one observable outcome. Each finished case lives in its own file with an ID, and at least one test names that ID. A checker in the test run holds the two together in both directions. Use cases that show a screen the project owns have an SVG sketch.

The rules live in one place, [assets/README.md](assets/README.md), which becomes the use case folder's README. Read it before writing or reviewing a case: size, IDs, the header table, Given/When/Then, sketches, tagging tests, and Orwell’s six rules for readable use cases. In a repository that already has the folder, read its own README instead. Where it or the repository's agent instructions differ from the steps below, follow the repository.

[references/example.md](references/example.md) is a finished use case with its tagged tests and notes on why it is written that way. Match its level of detail when drafting.

## Set up in a repository

Inspect the existing folder, index, work list and test command first. On a partial installation, add only the missing pieces and preserve existing cases and project conventions.

1. **Pick the places** using the repository’s conventions: the finished use case folder under `Docs/` (default `Docs/use-cases`), the work list under `Plans/` (default `Plans/USE_CASES.md`), and the test root. If tests span several roots, list each one.
2. **Copy the assets:**
   - [assets/README.md](assets/README.md) → `<folder>/README.md`. Fill in the scope paragraph: whose behaviour the use cases describe, the project's areas, and which screens are the project's own (only those get sketches). Correct the work-list path if it is not `Plans/USE_CASES.md`.
   - [assets/TEMPLATE.md](assets/TEMPLATE.md) and [assets/TEMPLATE.svg](assets/TEMPLATE.svg) → `<folder>/`.
   - [assets/USE_CASES.md](assets/USE_CASES.md) → the work list.
3. **Copy the checker:** [scripts/use-cases.mjs](scripts/use-cases.mjs) (the checks) and [scripts/check-use-cases.mjs](scripts/check-use-cases.mjs) (the paths, the loader and the command) side by side, for example into `scripts/`, and [scripts/use-cases.test.ts](scripts/use-cases.test.ts) into the tests, for example `tests/tooling/`. Set `USE_CASES`, `TEST_ROOTS` and `OWN_TESTS` at the top of `check-use-cases.mjs`. In the test, adapt the two imports and the root URL; its fixtures follow the paths you set. It needs Node 22 or later.
4. **Wire it into the test run.** With Vitest, make sure the repository's test command runs the copied test. Without Vitest, leave the test out and add `node scripts/check-use-cases.mjs` to the checks: it prints each problem and exits with 1 if there is one.
5. **Fill the work list** with behaviours that exist but are not written up, taken from the project's own docs.
6. **Run the checker.** With no use cases it passes; it fails as soon as a test names an ID that has no use case.

## Choose the task

- For a review, report discrepancies with file references. Leave the files as found.
- For an update, retain the ID. For a split, retain the ID for the original outcome and allocate a fresh ID for each additional outcome. Update incoming links, index rows and test tags together.
- To retire a case, delete its file, sketch and index row and remove the ID from its tests. Leave the number unused: record it where the project keeps such things, or rely on version history.
- Keep proposals, queued behaviours and partially completed cases under `Plans/`. Use **In progress** for a case already started, even if the behaviour is live. Keep its draft text and unfinished sketch there and record what remains. New cases receive an ID when they move to `Docs/`.
- For an existing behaviour, follow the steps below. Use British spelling in prose, test descriptions and sketch annotations. Copy product labels, API fields and identifiers exactly.

## Write one

1. **Select the named behaviour**, or the first **In progress** case when asked for the next case. If none is underway, take the first **Built, not yet written up** row. Check the index for an existing case before allocating an ID. When asked for the next case and the queue is empty, report that.
2. **Find the tests that already cover it.** Grep for the example values in the docs the behaviour came from.
3. **Finish the draft in Plans.** Write Given, When and Then. For an owned screen, prepare and inspect the SVG sketch. For other behaviour, write the rule. If coverage is missing, write the test first and watch it fail. If the behaviour already exists, show the test can fail by running it once with a wrong expectation. Run the relevant tests and confirm they pass.
4. **Move the finished case to Docs.** Allocate the next ID, move the completed text and any sketch into `Docs/use-cases/`, and update relative links. [Tag the tests](#tag-the-tests) that prove this outcome, link their files under **Tests**, and add the index row. Between tagging and the index row the checker fails; that is the expected red.
5. **Verify the move.** Run the checker (the repository's test command, or `node scripts/check-use-cases.mjs`), tagged suites and repository lint and format checks. Remove the Plans entry once verification succeeds. Edit the index and the work list separately: a work-list row is often a substring of its index row, so a find-and-replace can hit the wrong one. If work stops with the case incomplete, keep the draft and outstanding work in Plans and withdraw any provisional Docs entry, index row and new ID tags.

For example, if UC-008 was retired and UC-007 is the highest remaining case, allocate UC-009. Recheck the index before finishing if someone else is adding cases.

## Tag the tests

Tag only the tests that prove this outcome. Coverage often sits in a shared table (`test.each`, a loop, `[InlineData]` rows) that covers several behaviours, and tagging the table claims rows that belong to other use cases. Move this outcome's rows into their own test instead:

- **Vitest or Playwright:** a `test("UC-<nnn>: …")` or `describe("UC-<nnn>: …")` with a literal title. Extract a helper rather than duplicate the steps. A `test.each` that holds only this outcome's rows may carry the ID in its title.
- **xUnit:** a new `[Theory]` with `[Trait("UseCase", "UC-<nnn>")]` holding those rows. Remove them from the old theory and correct its comment.
- **Boundaries:** add rows that pin the edge where the behaviour invites it, such as a near miss or a different letter case.

Run one case's tests with `dotnet test --filter "UseCase=UC-<nnn>"`, `vitest run -t "UC-<nnn>"` or `playwright test --grep "UC-<nnn>"`.

## Draw a sketch

1. **Look at the real screen first.** Run the app and take a screenshot (Playwright, browser tools) into a scratch folder. Delete any throwaway test afterwards.
2. **Draw a wireframe** from `TEMPLATE.svg`: grey boxes, the screen's real labels and values, one red dashed callout with a short note on what the use case is about. Use the same description for the SVG's `<title>` and the Markdown alt text.
3. **Render it and look:** `rsvg-convert -w 1200 sketch.svg -o out.png`, then view the PNG. Overflowing text is the usual fault; widen the canvas or wrap the line. `xmllint --noout sketch.svg` checks it is well formed. Without `rsvg-convert`, open the SVG in a browser and take a screenshot.

## Notes

- Keep one emphasis style per Markdown file (`*x*` or `_x_`); markdownlint's MD049 flags a mix.
- Commit only when the user asks.
