// Every use case has tests, and every test that names a use case is listed by it. A test names a
// use case in its title (Vitest and Playwright) or with [Trait("UseCase", "UC-001")] (xUnit).
// Adjust the imports and the root below to where the checker and this file live; the fixtures
// follow the paths set in check-use-cases.mjs.
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { INDEX, USE_CASES, loadRepository } from "./check-use-cases.mjs";
import { checkUseCases, taggedIds } from "./use-cases.mjs";

const root = fileURLToPath(new URL("../../", import.meta.url));

interface RepoFile {
  readonly path: string;
  readonly text: string;
}

const CHECKOUT = "tests/checkout.test.ts";
const NAME = "empty-basket-cannot-check-out";

const document = (
  fileName: string,
  heading: string,
  tests: readonly string[] = [CHECKOUT],
): RepoFile => ({
  path: `${USE_CASES}/${fileName}`,
  text: [
    `# ${heading}: An empty basket cannot be checked out`,
    "",
    "| | |",
    "| --- | --- |",
    "| **GUI** | No |",
    "",
    "## Tests",
    "",
    ...tests.map((file) => `- [${file}](${path.posix.relative(USE_CASES, file)})`),
    "",
  ].join("\n"),
});

const useCase = (id: string, tests: readonly string[] = [CHECKOUT]): RepoFile =>
  document(`${id}-${NAME}.md`, id, tests);

// UC-001 without the row that says whether it has a GUI.
const PLAIN = useCase("UC-001");
const UNMARKED: RepoFile = {
  path: PLAIN.path,
  text: PLAIN.text.replace("| **GUI** | No |\n", ""),
};

const SKETCH = `${USE_CASES}/UC-001-${NAME}.svg`;

// UC-001 with a GUI, embedding `embed` above its tests.
const sketched = (embed: string): RepoFile => {
  const file = useCase("UC-001");
  return {
    path: file.path,
    text: file.text
      .replace("| **GUI** | No |", "| **GUI** | Yes |")
      .replace("## Tests", `${embed}\n\n## Tests`),
  };
};

const index = (...ids: readonly string[]): RepoFile => ({
  path: INDEX,
  text: ids.map((id) => `- [${id}](${id}-${NAME}.md)`).join("\n"),
});

const tagged = (id: string, file = CHECKOUT): RepoFile => ({
  path: file,
  text: `test("${id}: an empty basket is refused", async () => {});`,
});

describe("which tests name a use case", () => {
  test("a Vitest or Playwright title, including describe and modifiers", () => {
    const source = [
      'test("UC-001: shown", () => {});',
      "it.only('UC-002 and UC-003', () => {});",
      'describe("UC-004: delivery", () => {});',
      'test("free delivery", { tag: "@x" }, () => {});',
    ].join("\n");
    expect(taggedIds("tests/a.test.ts", source)).toEqual(["UC-001", "UC-002", "UC-003", "UC-004"]);
  });

  test("a title after each or for, with a table of rows or a tagged template", () => {
    const source = [
      'test.each([[1, "a"], [2, "b"]])("UC-001: row %i", () => {});',
      'describe.for(rows)("UC-002: %s", () => {});',
      "it.each`\n  n\n  1\n`('UC-003: $n', () => {});",
    ].join("\n");
    expect(taggedIds("tests/a.test.ts", source)).toEqual(["UC-001", "UC-002", "UC-003"]);
  });

  test("a skipped, todo or fixme test does not count", () => {
    const source = [
      'test.skip("UC-001: shown", () => {});',
      'it.todo("UC-002: later");',
      'test.fixme("UC-003: broken", () => {});',
      'describe.skip.each(rows)("UC-004: %s", () => {});',
    ].join("\n");
    expect(taggedIds("tests/a.test.ts", source)).toEqual([]);
  });

  test("an xUnit trait", () => {
    const source = '[Fact]\n[Trait("UseCase", "UC-007")]\npublic void Shown() { }';
    expect(taggedIds("tests/dotnet/core/A.cs", source)).toEqual(["UC-007"]);
  });

  test("a Rust test function whose name contains a use case ID", () => {
    const source = [
      "#[test]",
      "fn uc_008_rejects_an_empty_basket() {}",
      "#[test]",
      "fn an_unrelated_test() {}",
      "fn uc_009_not_a_test() {}",
    ].join("\n");
    expect(taggedIds("crates/shop/tests/checkout.rs", source)).toEqual(["UC-008"]);
  });

  test("Swift Testing titles and XCTest method names", () => {
    const testing = '@Test("UC-009: refuses an empty basket") func refusesEmptyBasket() {}';
    const xctest = "func testUC010RejectsAnEmptyBasket() {}";
    expect(taggedIds("Tests/CheckoutTests.swift", `${testing}\n${xctest}`)).toEqual([
      "UC-009",
      "UC-010",
    ]);
  });

  test("a comment that mentions a use case does not count", () => {
    expect(taggedIds("tests/a.test.ts", "// see UC-001\ntest('shown', () => {});")).toEqual([]);
  });
});

describe("a use case and its tests", () => {
  test("a use case with a listed, tagged test and an index entry passes", () => {
    expect(
      checkUseCases({
        documents: [useCase("UC-001"), index("UC-001")],
        sketches: [],
        testFiles: [tagged("UC-001")],
      }),
    ).toEqual([]);
  });

  test("a use case without tests fails", () => {
    expect(
      checkUseCases({
        documents: [useCase("UC-001", []), index("UC-001")],
        sketches: [],
        testFiles: [],
      }),
    ).toEqual(["UC-001 lists no tests under ## Tests"]);
  });

  test("a listed file that does not tag the use case fails", () => {
    expect(
      checkUseCases({
        documents: [useCase("UC-001"), index("UC-001")],
        sketches: [],
        testFiles: [{ path: CHECKOUT, text: "test('shown', () => {});" }],
      }),
    ).toEqual([`UC-001 lists ${CHECKOUT}, which has no test named UC-001`]);
  });

  test("a listed file that is not a test file fails", () => {
    expect(
      checkUseCases({
        documents: [useCase("UC-001", ["tests/support.ts"]), index("UC-001")],
        sketches: [],
        testFiles: [],
      }),
    ).toEqual(["UC-001 lists tests/support.ts, which is not a test file"]);
  });
});

describe("tests that name a use case", () => {
  test("a test file that tags the use case but is not listed fails", () => {
    expect(
      checkUseCases({
        documents: [useCase("UC-001"), index("UC-001")],
        sketches: [],
        testFiles: [tagged("UC-001"), tagged("UC-001", "tests/e2e/rule-row.spec.ts")],
      }),
    ).toEqual(["tests/e2e/rule-row.spec.ts names UC-001, but UC-001 does not list it"]);
  });

  test("a test that names an unknown use case fails", () => {
    expect(
      checkUseCases({ documents: [index()], sketches: [], testFiles: [tagged("UC-009")] }),
    ).toEqual([`${CHECKOUT} names UC-009, which has no use case`]);
  });
});

describe("names and the index", () => {
  test("a file name, heading or index entry out of line fails", () => {
    expect(
      checkUseCases({
        documents: [
          document(`UC-001-${NAME}.md`, "UC-002"),
          { path: `${USE_CASES}/delivery.md`, text: "# Delivery" },
          index(),
        ],
        sketches: [],
        testFiles: [tagged("UC-001")],
      }),
    ).toEqual([
      `${USE_CASES}/delivery.md: a use case's file name is UC-<three digits>-<kebab-case>.md`,
      `UC-001 is missing from ${INDEX}`,
      "UC-001: the first heading must start with '# UC-001: '",
    ]);
  });

  test("an index row for a use case that no longer exists fails", () => {
    expect(
      checkUseCases({
        documents: [useCase("UC-001"), index("UC-001", "UC-002")],
        sketches: [],
        testFiles: [tagged("UC-001")],
      }),
    ).toEqual([`${INDEX} links UC-002-${NAME}.md, which does not exist`]);
  });

  test("a folder without an index fails", () => {
    expect(
      checkUseCases({
        documents: [useCase("UC-001")],
        sketches: [],
        testFiles: [tagged("UC-001")],
      }),
    ).toEqual(["the use case folder has no README.md to hold the index"]);
  });

  test("two use cases with the same ID fail", () => {
    expect(
      checkUseCases({
        documents: [useCase("UC-001"), document("UC-001-other.md", "UC-001"), index("UC-001")],
        sketches: [],
        testFiles: [tagged("UC-001")],
      }),
    ).toEqual(["UC-001 is used by more than one file"]);
  });
});

describe("sketches of use cases with a GUI", () => {
  test("an embedded sketch beside the use case passes", () => {
    expect(
      checkUseCases({
        documents: [
          sketched(`![The disabled checkout button](UC-001-${NAME}.svg)`),
          index("UC-001"),
        ],
        sketches: [SKETCH],
        testFiles: [tagged("UC-001")],
      }),
    ).toEqual([]);
  });

  test("a use case that does not say whether it has a GUI fails", () => {
    expect(
      checkUseCases({
        documents: [UNMARKED, index("UC-001")],
        sketches: [],
        testFiles: [tagged("UC-001")],
      }),
    ).toEqual(["UC-001: the header table needs a '| **GUI** | Yes |' or '| **GUI** | No |' row"]);
  });

  test("a GUI use case that links its sketch without ! fails", () => {
    expect(
      checkUseCases({
        documents: [
          sketched(`[The disabled checkout button](UC-001-${NAME}.svg)`),
          index("UC-001"),
        ],
        sketches: [SKETCH],
        testFiles: [tagged("UC-001")],
      }),
    ).toEqual([`UC-001 has a GUI but does not embed its sketch: ![…](UC-001-${NAME}.svg)`]);
  });

  test("a sketch file that does not exist fails", () => {
    expect(
      checkUseCases({
        documents: [
          sketched(`![The disabled checkout button](UC-001-${NAME}.svg)`),
          index("UC-001"),
        ],
        sketches: [],
        testFiles: [tagged("UC-001")],
      }),
    ).toEqual([`UC-001's sketch ${SKETCH} does not exist`]);
  });
});

test("a sketch left behind without its use case fails", () => {
  const orphan = `${USE_CASES}/UC-002-${NAME}.svg`;
  expect(
    checkUseCases({
      documents: [useCase("UC-001"), index("UC-001")],
      sketches: [orphan, `${USE_CASES}/TEMPLATE.svg`],
      testFiles: [tagged("UC-001")],
    }),
  ).toEqual([`${orphan} has no use case beside it`]);
});

test.skipIf(!existsSync(path.join(root, USE_CASES)))("the repository's use cases and tests agree", () => {
  expect(checkUseCases(loadRepository(root))).toEqual([]);
});
