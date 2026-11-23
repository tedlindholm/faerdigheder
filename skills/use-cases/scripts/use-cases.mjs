// The checks that keep the use case folder and the tests in step (rules in the folder's README.md):
// every use case lists tests that name its ID, every test naming an ID is listed by that use case,
// every GUI use case embeds its sketch, and the index lists the use cases and nothing else. Reads
// no files: check-use-cases.mjs loads the repository and holds its paths.

import path from "node:path";

// The index is the table of use cases at the end of the folder's README.
const INDEX_NAME = "README.md";
const NONE = 0;

const ID = /\bUC-\d{3}\b/gu;
const FILE_NAME = /^(?<id>UC-\d{3})-[a-z0-9]+(?:-[a-z0-9]+)*\.md$/u;
// A title is the first argument of test, it or describe, whatever modifiers they carry. After
// `.each` or `.for` it is the first argument of the second call: test.each(rows)("title", …).
const TITLE =
  /\b(?:test|it|describe)(?<modifiers>(?:\.\w+)*)(?:(?<=\.(?:each|for))(?:\([\s\S]*?\)|`[^`]*`))?\(\s*(?<quote>["'`])(?<title>(?:(?!\k<quote>)[^\\]|\\.)*)\k<quote>/gu;
// Modifiers that keep a test from running: its title is not coverage.
const NOT_RUN = /\.(?:skip|todo|fixme)\b/u;
const TRAIT = /\[Trait\(\s*"UseCase"\s*,\s*"(?<id>UC-\d{3})"\s*\)\]/gu;
const LINK = /\]\((?<target>[^)\s]+)\)/gu;
const IMAGE = /!\[[^\]]*\]\((?<target>[^)\s]+)\)/gu;
const GUI = /^\|\s*\*\*GUI\*\*\s*\|\s*(?<answer>Yes|No)\s*\|/mu;
const TESTS_SECTION = /^## Tests[ \t]*$(?<body>[\s\S]*?)(?=^## |(?![\s\S]))/mu;
const USE_CASE_FILE = /^UC-\d{3}-/u;

/**
 * @typedef {Readonly<{ path: string; text: string }>} RepoFile A file and its text; the path is
 *   relative to the repository root, with forward slashes.
 * @typedef {Readonly<{
 *   documents: readonly RepoFile[];
 *   sketches: readonly string[];
 *   testFiles: readonly RepoFile[];
 * }>} Repository `documents` are the Markdown files in the use case folder, the index included
 *   and the template left out; `sketches` are the SVG files there; `testFiles` are the test sources.
 * @typedef {Readonly<{ id: string; file: RepoFile; listed: readonly string[] }>} UseCase
 * @typedef {Readonly<{
 *   index: RepoFile;
 *   sketches: readonly string[];
 *   tags: Readonly<Record<string, readonly string[]>>;
 *   useCases: readonly UseCase[];
 * }>} Context The index, the sketches, the IDs each test file names, and the use cases.
 */

/**
 * A named group of a match, or "" when there is no match or the group did not take part.
 *
 * @param {Readonly<{ groups?: Readonly<Record<string, string>> }> | null} match
 * @param {string} name
 * @returns {string}
 */
const group = function group(match, name) {
  if (match === null) {
    return "";
  }
  return (match.groups ?? {})[name] ?? "";
};

/**
 * One named group of every match of `pattern` in `text`.
 *
 * @param {string} text
 * @param {Readonly<RegExp>} pattern A global pattern.
 * @param {string} name
 * @returns {string[]}
 */
const groups = function groups(text, pattern, name) {
  const found = [];
  for (const match of text.matchAll(pattern)) {
    found.push(group(match, name));
  }
  return found;
};

/**
 * The use cases a test file's tests name, in order of appearance.
 *
 * @param {string} file
 * @param {string} source
 * @returns {string[]}
 */
export const taggedIds = function taggedIds(file, source) {
  if (file.endsWith(".cs")) {
    return [...new Set(groups(source, TRAIT, "id"))];
  }
  const ids = [];
  for (const match of source.matchAll(TITLE)) {
    if (!NOT_RUN.test(group(match, "modifiers"))) {
      ids.push(...(group(match, "title").match(ID) ?? []));
    }
  }
  return [...new Set(ids)];
};

/**
 * A link target in a document, made relative to the repository root, without its anchor.
 *
 * @param {RepoFile} document
 * @param {string} target
 * @returns {string}
 */
const resolve = function resolve(document, target) {
  const directory = path.posix.dirname(document.path);
  return path.posix.normalize(path.posix.join(directory, target.replace(/#.*$/u, "")));
};

/**
 * The problems with how a use case's tests are listed and named.
 *
 * @param {UseCase} useCase
 * @param {Context} context
 * @returns {string[]}
 */
const checkListedTests = function checkListedTests(useCase, context) {
  const { id, listed } = useCase;
  if (listed.length === NONE) {
    return [`${id} lists no tests under ## Tests`];
  }
  return listed.flatMap((file) => {
    if (!Object.hasOwn(context.tags, file)) {
      return [`${id} lists ${file}, which is not a test file`];
    }
    if (!context.tags[file].includes(id)) {
      return [`${id} lists ${file}, which has no test named ${id}`];
    }
    return [];
  });
};

/**
 * The problems with a GUI use case's sketch: it embeds UC-<nnn>-<name>.svg beside it, which exists.
 *
 * @param {UseCase} useCase
 * @param {Context} context
 * @returns {string[]}
 */
const checkEmbeddedSketch = function checkEmbeddedSketch(useCase, context) {
  const { id, file } = useCase;
  const sketch = file.path.replace(/\.md$/u, ".svg");
  const embedded = groups(file.text, IMAGE, "target").map((target) => resolve(file, target));
  if (!embedded.includes(sketch)) {
    return [`${id} has a GUI but does not embed its sketch: ![…](${path.posix.basename(sketch)})`];
  }
  if (!context.sketches.includes(sketch)) {
    return [`${id}'s sketch ${sketch} does not exist`];
  }
  return [];
};

/**
 * Whether a use case says it has a GUI, and if so the problems with its sketch.
 *
 * @param {UseCase} useCase
 * @param {Context} context
 * @returns {string[]}
 */
const checkSketch = function checkSketch(useCase, context) {
  switch (group(GUI.exec(useCase.file.text), "answer")) {
    case "Yes": {
      return checkEmbeddedSketch(useCase, context);
    }
    case "No": {
      return [];
    }
    default: {
      const { id } = useCase;
      return [`${id}: the header table needs a '| **GUI** | Yes |' or '| **GUI** | No |' row`];
    }
  }
};

/**
 * The problems with one use case: its heading, its place in the index, its sketch and its tests.
 *
 * @param {UseCase} useCase
 * @param {Context} context
 * @returns {string[]}
 */
const checkUseCase = function checkUseCase(useCase, context) {
  const { id, file } = useCase;
  const problems = [];
  if (!file.text.startsWith(`# ${id}: `)) {
    problems.push(`${id}: the first heading must start with '# ${id}: '`);
  }
  if (!context.index.text.includes(`(${path.posix.basename(file.path)})`)) {
    problems.push(`${id} is missing from ${context.index.path}`);
  }
  return [...problems, ...checkSketch(useCase, context), ...checkListedTests(useCase, context)];
};

/** @type {(file: RepoFile) => string[]} The test files linked under `## Tests`. */
const listedTests = (file) =>
  groups(group(TESTS_SECTION.exec(file.text), "body"), LINK, "target").map((target) =>
    resolve(file, target),
  );

/**
 * Every test that names a use case which does not exist or does not list the test's file.
 *
 * @param {Context} context
 * @returns {string[]}
 */
const checkTags = function checkTags(context) {
  const problems = [];
  for (const [file, ids] of Object.entries(context.tags)) {
    for (const id of ids) {
      const useCase = context.useCases.find((candidate) => candidate.id === id);
      if (!useCase) {
        problems.push(`${file} names ${id}, which has no use case`);
      } else if (!useCase.listed.includes(file)) {
        problems.push(`${file} names ${id}, but ${id} does not list it`);
      }
    }
  }
  return problems;
};

/**
 * The index's links to use case files that do not exist, as a retired use case leaves behind.
 *
 * @param {RepoFile} index
 * @param {readonly RepoFile[]} files The use case documents, without the index.
 * @returns {string[]}
 */
const checkIndexLinks = function checkIndexLinks(index, files) {
  return groups(index.text, LINK, "target")
    .filter((target) => FILE_NAME.test(path.posix.basename(target)))
    .filter((target) => !files.some((file) => file.path === resolve(index, target)))
    .map((target) => `${index.path} links ${target}, which does not exist`);
};

/**
 * The sketches named like a use case that have no use case of the same name beside them.
 *
 * @param {readonly string[]} sketches
 * @param {readonly RepoFile[]} files The use case documents, without the index.
 * @returns {string[]}
 */
const checkOrphanSketches = function checkOrphanSketches(sketches, files) {
  return sketches
    .filter((sketch) => USE_CASE_FILE.test(path.posix.basename(sketch)))
    .filter((sketch) => !files.some((file) => file.path === sketch.replace(/\.svg$/u, ".md")))
    .map((sketch) => `${sketch} has no use case beside it`);
};

/**
 * The use case files that have an ID, the first file standing for an ID used twice, and the
 * problems with the others' names.
 *
 * @param {readonly RepoFile[]} files The use case documents, without the index.
 * @returns {{ useCases: UseCase[]; problems: string[] }}
 */
const identify = function identify(files) {
  /** @type {UseCase[]} */
  const useCases = [];
  const problems = [];
  for (const file of files) {
    const id = group(FILE_NAME.exec(path.posix.basename(file.path)), "id");
    if (id === "") {
      problems.push(`${file.path}: a use case's file name is UC-<three digits>-<kebab-case>.md`);
    } else if (useCases.some((useCase) => useCase.id === id)) {
      problems.push(`${id} is used by more than one file`);
    } else {
      useCases.push({ file, id, listed: listedTests(file) });
    }
  }
  return { problems: [...new Set(problems)], useCases };
};

/**
 * Every disagreement between the use cases, their index, their sketches and the tests, sorted.
 *
 * @param {Repository} repository
 * @returns {string[]}
 */
export const checkUseCases = function checkUseCases({ documents, sketches, testFiles }) {
  const index = documents.find((document) => path.posix.basename(document.path) === INDEX_NAME);
  if (!index) {
    return [`the use case folder has no ${INDEX_NAME} to hold the index`];
  }
  const files = documents.filter((document) => document !== index);
  const { problems, useCases } = identify(files);
  /** @type {Record<string, readonly string[]>} */
  const tags = {};
  for (const file of testFiles) {
    tags[file.path] = taggedIds(file.path, file.text);
  }
  /** @type {Context} */
  const context = { index, sketches, tags, useCases };
  return [
    ...problems,
    ...checkIndexLinks(index, files),
    ...checkOrphanSketches(sketches, files),
    ...useCases.flatMap((useCase) => checkUseCase(useCase, context)),
    ...checkTags(context),
  ].toSorted();
};
