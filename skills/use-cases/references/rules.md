# Use case rules

The rules a repository's use case README states; [assets/README.md](../assets/README.md) is the copy to put in the repository. The checker enforces the mechanical ones.

## Size

A use case is one behaviour. Write the outcome as one sentence: if it needs "and", "unless" or "except when", it is more than one use case. The same rule with facts that give a different outcome is a separate use case, linked under **Related**.

- Too big: "Rules on additional data handle text, numbers and missing keys."
- Right size: "A key that was not sent counts as empty, so *is* `tier:gold` is false."

## IDs and files

- File name `UC-<three digits>-<kebab-case>.md`; first line `# UC-<nnn>: <the outcome sentence>`.
- Take the next free number from the index. Never reuse one, even after a delete.
- Every use case has a row in the index at the end of the folder's README.

## Header table

| Field | Meaning |
| --- | --- |
| **Area** | The project's areas, for example *Backoffice*, *Syntax*, *Workflow*. |
| **GUI** | *Yes* when the use case is about a screen the project owns; otherwise *No*. |

Leave out fields nobody maintains, such as an owner.

## Given, When and Then

- **Given**: the starting point: what is set up, and the input. Show input data as a short example. Say when a value is missing: missing is not the same as empty.
- **When**: the single action.
- **Then**: the single observable outcome. Name the field or screen element and quote the text.

Fictional data only: no real customers, bookings, payment details or tokens.

## Sketches

Only screens the project owns get a sketch. Screens another team or product renders are out of scope, even when the use case says what ends up there.

- An SVG next to the use case with the same name (`UC-001-x.svg` for `UC-001-x.md`), one per use case.
- Embedded under **Sketch** with the image syntax, with alt text describing the screen: `![What the panel shows](UC-001-x.svg)`.
- A wireframe, not a screenshot: grey boxes, the real labels and values, a red note on what the use case is about.

A GUI *No* use case renames **Sketch** to **Rule** and writes the rule or input as text, often with a small table of what matches.

## Tests

- **The test names the use case.** Vitest and Playwright: the ID in a literal title, `test("UC-001: …")`, or on a `describe` that then covers every test inside. xUnit: `[Trait("UseCase", "UC-001")]`. An ID in a comment, a `%s` title or a template title does not count.
- **The use case lists the test files** under `## Tests`, as links relative to the use case.
- Both ways: a test naming an ID must be listed by that use case, and a listed file must have a test naming it. A test may name several IDs.

## The work list

A separate file outside the use case folder (for example `Plans/USE_CASES.md`), not checked:

- **Built, not yet written up**: a table of behaviours that exist, with Area and GUI.
- **Not built yet**: drafts without an ID, in the template's sections. Built test-first, then moved to the folder with the next free ID.

IDs are only handed out in the folder, so dropped drafts leave no gaps.
