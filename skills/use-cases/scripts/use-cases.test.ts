// Every use case has tests, and every test that names a use case is listed by it. A test names a
// use case in its title (Vitest and Playwright) or with [Trait("UseCase", "UC-001")] (xUnit).
// Adjust the import below to where the checker lives.
import { describe, expect, test } from "vitest";
import { checkUseCases, loadRepository, taggedIds } from "../../scripts/use-cases.mjs";

const root = new URL("../../", import.meta.url).pathname;

interface RepoFile {
  readonly path: string;
  readonly text: string;
}

const CONDITIONS = "tests/cms/conditions.test.ts";
const NAME = "gold-member-sees-dinner";

const document = (
  fileName: string,
  heading: string,
  tests: readonly string[] = [CONDITIONS],
): RepoFile => ({
  path: `Docs/use-cases/${fileName}`,
  text: [
    `# ${heading}: A gold member sees the dinner question`,
    "",
    "| | |",
    "| --- | --- |",
    "| **GUI** | No |",
    "",
    "## Tests",
    "",
    ...tests.map((file) => `- [${file}](../../${file})`),
    "",
  ].join("\n"),
});

const useCase = (id: string, tests: readonly string[] = [CONDITIONS]): RepoFile =>
  document(`${id}-${NAME}.md`, id, tests);

const SKETCH = `Docs/use-cases/UC-001-${NAME}.svg`;

// UC-001 with a GUI, embedding `embed` above its tests.
const sketched = (embed: string): RepoFile => {
  const { path, text } = useCase("UC-001");
  return {
    path,
    text: text
      .replace("| **GUI** | No |", "| **GUI** | Yes |")
      .replace("## Tests", `${embed}\n\n## Tests`),
  };
};

const index = (...ids: readonly string[]): RepoFile => ({
  path: "Docs/use-cases/README.md",
  text: ids.map((id) => `- [${id}](${id}-${NAME}.md)`).join("\n"),
});

const tagged = (id: string, file = CONDITIONS): RepoFile => ({
  path: file,
  text: `test("${id}: gold, Pick 2, One missing", async () => {});`,
});

describe("which tests name a use case", () => {
  test("a Vitest or Playwright title, including describe and modifiers", () => {
    const source = [
      'test("UC-001: shown", () => {});',
      "it.skip('UC-002 and UC-003', () => {});",
      'describe("UC-004: dinner", () => {});',
      'test("gold member", { tag: "@x" }, () => {});',
    ].join("\n");
    expect(taggedIds("tests/cms/a.test.ts", source)).toEqual([
      "UC-001",
      "UC-002",
      "UC-003",
      "UC-004",
    ]);
  });

  test("an xUnit trait", () => {
    const source = '[Fact]\n[Trait("UseCase", "UC-007")]\npublic void Shown() { }';
    expect(taggedIds("tests/dotnet/core/A.cs", source)).toEqual(["UC-007"]);
  });

  test("a comment that mentions a use case does not count", () => {
    expect(taggedIds("tests/cms/a.test.ts", "// see UC-001\ntest('shown', () => {});")).toEqual([]);
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
        testFiles: [{ path: CONDITIONS, text: "test('shown', () => {});" }],
      }),
    ).toEqual([`UC-001 lists ${CONDITIONS}, which has no test named UC-001`]);
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
    ).toEqual([`${CONDITIONS} names UC-009, which has no use case`]);
  });
});

describe("names and the index", () => {
  test("a file name, heading or index entry out of line fails", () => {
    expect(
      checkUseCases({
        documents: [
          document(`UC-001-${NAME}.md`, "UC-002"),
          { path: "Docs/use-cases/dinner.md", text: "# Dinner" },
          index(),
        ],
        sketches: [],
        testFiles: [tagged("UC-001")],
      }),
    ).toEqual([
      "Docs/use-cases/dinner.md: a use case's file name is UC-<three digits>-<kebab-case>.md",
      "UC-001 is missing from Docs/use-cases/README.md",
      "UC-001: the first heading must start with '# UC-001: '",
    ]);
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
        documents: [sketched(`![The dinner question](UC-001-${NAME}.svg)`), index("UC-001")],
        sketches: [SKETCH],
        testFiles: [tagged("UC-001")],
      }),
    ).toEqual([]);
  });

  test("a use case that does not say whether it has a GUI fails", () => {
    const { path, text } = useCase("UC-001");
    expect(
      checkUseCases({
        documents: [{ path, text: text.replace("| **GUI** | No |\n", "") }, index("UC-001")],
        sketches: [],
        testFiles: [tagged("UC-001")],
      }),
    ).toEqual(["UC-001: the header table needs a '| **GUI** | Yes |' or '| **GUI** | No |' row"]);
  });

  test("a GUI use case that links its sketch without ! fails", () => {
    expect(
      checkUseCases({
        documents: [sketched(`[The dinner question](UC-001-${NAME}.svg)`), index("UC-001")],
        sketches: [SKETCH],
        testFiles: [tagged("UC-001")],
      }),
    ).toEqual([`UC-001 has a GUI but does not embed its sketch: ![…](UC-001-${NAME}.svg)`]);
  });

  test("a sketch file that does not exist fails", () => {
    expect(
      checkUseCases({
        documents: [sketched(`![The dinner question](UC-001-${NAME}.svg)`), index("UC-001")],
        sketches: [],
        testFiles: [tagged("UC-001")],
      }),
    ).toEqual([`UC-001's sketch ${SKETCH} does not exist`]);
  });
});

test("the repository's use cases and tests agree", () => {
  expect(checkUseCases(loadRepository(root))).toEqual([]);
});
