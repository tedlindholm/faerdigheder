// Loads a repository's use cases and test sources for the checks in use-cases.mjs. Set USE_CASES,
// TEST_ROOTS and OWN_TESTS to the repository's layout; all are relative to the repository root.
// The checker's test calls loadRepository; `node scripts/check-use-cases.mjs` from the root runs the
// checks alone, prints each problem and fails if there is one.

import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { checkUseCases } from "./use-cases.mjs";

export const USE_CASES = "Docs/use-cases";
const TEST_ROOTS = ["tests"];
// The checker's own tests write titles that name use cases as fixtures, so they are not scanned.
const OWN_TESTS = "tests/tooling/use-cases.test.ts";
export const INDEX = `${USE_CASES}/README.md`;
const TEMPLATE = `${USE_CASES}/TEMPLATE.md`;
// Vitest, Jest and Playwright files by name; any C# file, since xUnit tests carry a trait.
const TEST_SOURCE = /\.(?:test|spec)\.[cm]?[jt]sx?$|\.cs$/u;
const BUILD_OUTPUT = /\/(?:bin|obj|node_modules)\//u;
const NONE = 0;
const FAILED = 1;

/**
 * The repository-relative paths of the files under `directory`, build output left out.
 *
 * @param {string} root
 * @param {string} directory
 * @returns {string[]}
 */
const filesUnder = function filesUnder(root, directory) {
  return readdirSync(path.join(root, directory), { encoding: "utf8", recursive: true })
    .map((file) => path.posix.join(directory, file.split(path.sep).join("/")))
    .filter((file) => !BUILD_OUTPUT.test(file));
};

/**
 * The use case documents, their sketches and the test sources of the repository at `root`.
 *
 * @param {string} root
 * @returns {import("./use-cases.mjs").Repository}
 */
export const loadRepository = function loadRepository(root) {
  /** @param {string} file */
  const read = (file) => ({ path: file, text: readFileSync(path.join(root, file), "utf8") });
  const useCaseFiles = filesUnder(root, USE_CASES);
  return {
    documents: useCaseFiles
      .filter((file) => file.endsWith(".md") && file !== TEMPLATE)
      .map((file) => read(file)),
    sketches: useCaseFiles.filter((file) => file.endsWith(".svg")),
    testFiles: TEST_ROOTS.flatMap((testRoot) => filesUnder(root, testRoot))
      .filter((file) => file !== OWN_TESTS && TEST_SOURCE.test(file))
      .map((file) => read(file)),
  };
};

const [, script] = process.argv;
if (script === import.meta.filename) {
  const problems = checkUseCases(loadRepository(process.cwd()));
  if (problems.length > NONE) {
    process.stderr.write(`${problems.join("\n")}\n`);
    process.exitCode = FAILED;
  }
}
