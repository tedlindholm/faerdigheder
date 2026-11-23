# Use cases

<!-- Scope: replace this paragraph. Say whose behaviour the use cases describe (for example "how an editor sets up conditions in the backoffice"), and which screens are the project's own: only those get sketches. -->

Each use case lives in its own file, has an ID, and is covered by at least one test. This folder holds only use cases whose behaviour exists and is tested; the ones still to write, and drafts for behaviour not built yet, are in the work list (`Plans/USE_CASES.md`).

The test run checks the mechanical rules on this page: IDs, file names, the index, sketches and the link between use cases and tests. It cannot check whether a use case is well written; that is up to you and the reviewer.

## What a use case is

A use case is **one behaviour**: given a starting point, when one thing happens, then one outcome follows. Keep it that small. Small use cases are easy to test, easy to review, and easy to find when something breaks.

A good test of size: write the outcome as one sentence. If the sentence needs "and", "unless" or "except when", you have more than one use case. When several use cases share a rule and differ only in the input, link them to each other under **Related**.

## Write a new use case

1. **Pick the next ID.** Look at the index below and take the next free number, three digits: `UC-001`, `UC-002`, and so on. Never reuse a number, even if a use case is deleted.
2. **Copy the template.** Copy [TEMPLATE.md](TEMPLATE.md) to `UC-<number>-<short-name>.md`, with the name in lower case and words joined by hyphens.
3. **Write the heading.** Replace the first line with the ID and the outcome sentence: `# UC-001: <the outcome>`.
4. **Fill in the header table.** **Area** is one of the project's areas. **GUI** is *Yes* when the use case is about a screen the project owns, otherwise *No*.
5. **Write Given, When and Then** (see below).
6. **Draw the sketch** if GUI is Yes. If GUI is No, rename **Sketch** to **Rule** and write the rule or input as text.
7. **Link the tests** (see below). Write the test first if it does not exist yet; the use case and its test go in together.
8. **Add a row to the index** at the end of this page, and remove the use case from the work list if it was listed there.
9. **Run the tests** to check the rules.

## Given, When and Then

**Given** is the starting point: what is set up, and the input. Show input data as a short example. If a value is missing in this use case, say so: a missing value is a different situation from an empty one.

**When** is the single action.

**Then** is the single outcome someone can observe. Be concrete: name the field or screen element and quote the text.

Use fictional data only. No real customers, bookings, payment details or tokens.

## Sketches

Only use cases about **a screen the project owns** have a sketch. Set GUI to *Yes* for those.

- **File:** an SVG file next to the use case, with the same name: `UC-001-example.svg` belongs to `UC-001-example.md`. One sketch per use case.
- **Embedding:** show it under **Sketch** with the ordinary Markdown image syntax, including the exclamation mark:

  ```markdown
  ![What the panel shows](UC-001-example.svg)
  ```

  The text in the square brackets describes what the screen shows, for readers who cannot see the image.
- **Style:** a wireframe, not a screenshot. Grey boxes for inputs, the real labels and values as text, and a red note pointing at what the use case is about. Start from [TEMPLATE.svg](TEMPLATE.svg).

## Tests

Every use case is covered by at least one test, and the link goes both ways:

- **The test names the use case.** In Vitest and Playwright, start the test's title with the ID: `test("UC-001: …", …)`. The ID can also go on a `describe`, which then covers every test inside it. In xUnit, add `[Trait("UseCase", "UC-001")]` to the test method. An ID in a comment does not count.
- **The use case lists the test file.** Under **Tests**, link every test file that has a test naming this ID, relative to the use case.

A test may cover more than one use case; give it each ID. If a test that names an ID is not listed by that use case, or a listed file has no test with the ID, the test run fails and says which.

## Index

| ID | Use case | Area | GUI |
| --- | --- | --- | --- |
