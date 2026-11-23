# Use cases

<!-- Scope: replace this paragraph. Say whose behaviour the use cases describe (for example "how a shopper checks out"), list the areas a use case can belong to, and say which screens are the project's own: only those get sketches. -->

This folder holds finished use cases. Keep proposed and partially completed cases in `Plans/USE_CASES.md`, including cases for behaviour that already works. For example, a case with passing tests and an unfinished sketch still belongs in Plans.

The checker compares file names, heading IDs, index links, GUI flags, sketch references and test-file tags, and reports index rows and sketches left behind by a use case that is gone. It scans source text. Run the tagged suites and read their assertions to confirm that an active test exercises the stated outcome. During review, also check the index row’s wording, area and GUI value, and the sketch’s placement and accuracy.

Use British spelling in descriptions and annotations. Preserve the exact spelling of quoted interface text, code identifiers and example API fields.

## What a use case is

A use case is **one behaviour**: given a starting point, when one thing happens, then one outcome follows. Keep it that small. Small use cases are easy to test, easy to review, and easy to find when something breaks.

A good test of size: write the outcome as one sentence. Split outcomes that can pass or fail independently: refusing an empty basket and emailing the shopper are two use cases. Two facts in Given, such as an empty basket and a signed-in shopper, can lead to one outcome. When the same rule gives a different outcome for different input, each outcome is its own use case; link them to each other under **Related**.

- Too big: “Checkout handles discounts, delivery and payment.”
- Right size: “An empty basket cannot be checked out.”

## Orwell’s six rules for readable use cases

Read the title and each Given, When and Then sentence aloud. Apply these six rules, adapted from George Orwell’s [Politics and the English Language](https://www.orwellfoundation.com/the-orwell-foundation/orwell/essays-and-other-works/politics-and-the-english-language/).

1. Replace tired figures of speech with what happens. “Checkout hits a snag” becomes “The payment fails”.
2. Choose a short word when it carries the meaning. “Start” works for “commence”.
3. Cut words that add nothing. “The basket is currently empty” becomes “The basket is empty”.
4. Use the active voice when you know who acts. “The shopper selects Pay” makes the When step clear.
5. Use everyday English where it is equally precise. “Every day” works for “per diem”.
6. Set a rule aside if following it makes the sentence awkward or changes its meaning. Keep exact field names and quoted screen text.

## Write a new use case

1. Draft the case in Plans using the sections in [TEMPLATE.md](TEMPLATE.md). Complete the rule or required sketch there and run the tests that prove the outcome.
2. Once the behaviour exists, the write-up is complete and its tests pass, move the case here. Assign the next three-digit ID above the highest ever allocated, including retired IDs; never reuse one. Start at `UC-001`. Name the file `UC-<number>-<short-name>.md` and begin its heading with the ID followed by the outcome.
3. Move any sketch alongside the case, update relative links, tag the tests and add the index row. Run the checker and tagged suites. Remove the Plans entry once they pass.

## Header table

**Area** is one of the project's areas. **GUI** is *Yes* when the use case is about a screen the project owns, otherwise *No*. Leave out fields nobody maintains, such as an owner.

## Given, When and Then

**Given** is the starting point: what is set up, and the input. Show input data as a short example. If a value is missing in this use case, say so: a missing value is a different situation from an empty one.

**When** is the single action.

**Then** is the single outcome someone can observe. Be concrete: name the field or screen element and quote the text.

Use fictional data only. No real customers, orders, payment details or tokens.

## Sketches

Only use cases about **a screen the project owns** have a sketch. Set GUI to *Yes* for those. A screen another team or product renders gets none, even when the use case says what ends up there.

- **File:** an SVG file next to the use case, with the same name: `UC-001-example.svg` belongs to `UC-001-example.md`. One sketch per use case.
- **Embedding:** show it under **Sketch** with the ordinary Markdown image syntax, including the exclamation mark:

  ```markdown
  ![What the panel shows](UC-001-example.svg)
  ```

  The text in the square brackets describes what the screen shows, for readers who cannot see the image.
- **Style:** a wireframe, not a screenshot. Use the screen's real labels, fictional values and a red note pointing at what the use case is about. Start from [TEMPLATE.svg](TEMPLATE.svg) or a more suitable existing project sketch; match the project's visual language when it has one.

A GUI *No* use case has a **Rule** section instead: the rule or input as text, often with a small table of what matches.

## Tests

Every use case is covered by at least one test, and the link goes both ways:

- **The test names the use case.** In Vitest and Playwright, start the test's title with the ID: `test("UC-001: …", …)`. The ID can also go on a `describe`, which then covers every test inside it. After `.each` or `.for` the title is the second call's: `test.each(rows)("UC-001: …", …)`. In xUnit, add `[Trait("UseCase", "UC-001")]` to the test method. In Rust, use `uc_001_<behaviour>` or `test_uc_001_<behaviour>` as the function name. In Swift Testing, include the ID in the `@Test` display name; in XCTest, include it as `testUC001...` in the method name. An ID in a comment does not count, nor does one on a skipped test (`.skip`, `.todo`, `.fixme`). A commented-out test or one that skips itself while running still looks like coverage to the checker, so confirm the tagged test ran.
- **The use case lists the test file.** Under **Tests**, link every test file that has a test naming this ID, relative to the use case.

A test may cover more than one use case; give it each ID. If a test that names an ID is not listed by that use case, or a listed file has no test with the ID, the test run fails and says which.

## Index

| ID | Use case | Area | GUI |
| --- | --- | --- | --- |
