---
name: tanstack-ai-code-mode
description: Build and tune TanStack AI Code Mode (execute_typescript, external_* tools, snippet_* bindings) with typed programmes, hand-declared tools, authored snippets and a small prompt. Use when adding a Code Mode agent, adding or declaring an external tool, writing snippets, or cutting the tokens of a Code Mode request. Includes what @tanstack/ai-code-mode does beyond its docs.
---

# TanStack AI Code Mode

Code Mode replaces a loop of tool calls with one `execute_typescript` call: the model writes a TypeScript programme
that awaits `external_<tool>()` functions inside an isolate, and only its return value comes back. Pinned to
`@tanstack/ai-code-mode` 0.5.2, `@tanstack/ai-code-mode-snippets` 0.4.24 and `@tanstack/ai-isolate-quickjs` 0.3.2.
On another version, re-read `node_modules/@tanstack/*/src` before trusting `references/hidden-knowledge.md`. Never
guess a Code Mode behaviour: read the installed source or the official docs.

## What to do

1. **Give the model typed code, not hope.** Pass `createCodeMode({ transpile })` a function that type-checks the
   programme against generated declarations before stripping it to JavaScript, and throw on diagnostics: Code Mode
   returns the compiler's message to the model as a tool error instead of running a broken programme. Compile the
   programme as the body of `async function programme(): Promise<ProgrammeResult>` so the return type is checked too,
   and derive `ProgrammeResult` from the same schema you parse the result with at runtime.
2. **Send the declarations once.** `createCodeMode` returns `systemPrompt`, but it is advisory text only: generic
   advice ("prefer calling tools directly", a weather example) around the same type stubs. If you already prompt with
   your declarations, do not also send `systemPrompt`; send one short note ("call `execute_typescript` once with a
   programme that awaits the declared `external_*` functions") above the declarations in a fenced `typescript` block.
3. **Keep two copies of the declarations.** The compiler's copy carries every doc comment; the model's copy carries
   only what a programme is written from. Field notes the model does not need to write a call go to the compiler
   alone. Generate both from one source so they cannot drift.
4. **Declare by hand what a schema cannot say.** A tool whose answer is typed by something richer than JSON Schema
   (a GraphQL schema, a discriminated union the converter flattens) gets a hand-written
   `declare function external_<name>(input: …): Promise<…>` in place of its generated stub, in both copies.
5. **Author snippets for repeated logic.** A `snippet_<name>` is a tested, type-checked function the programme calls
   instead of rewriting the same loop every turn. Compile each once against the same declarations, run it in its own
   isolate with the same bindings and limits, and keep its declaration shorter than the code it replaces; a snippet
   is prompt cost on every request, so one that is rarely used is a loss.
6. **Allow a further model request only for a correctable failure.** A compile rejection ran nothing, so one more
   attempt is cheap; a programme that ran and failed should fail the run. Use `agentLoopStrategy` to stop after the
   first programme that ran.
7. **Measure before cutting tokens.** Capture one request body with a scripted adapter, split the system prompt by
   heading and declaration, and count characters per part; then cut the largest duplicate first. Pin a size budget in
   a test so the cut stays.

## Token rules

- Each declaration appears once in the prompt.
- A tool description says what the instructions do not; a field description says what the name does not.
- Doc comments the model does not write a call from go to the compiler's copy only.
- No lazy tools when every tool is used every turn: discovery costs a request.
- No lookup tool for types: the model writes the whole programme before anything runs, so a function the programme
  can call cannot inform the code that calls it; put what the model needs in its copy of the declarations.
- Results are ids; code resolves them to records it already holds. A model-written return value is never data.

## A GraphQL API as one tool

Give the programme one `external_graphql({ query, variables })` tool and let code own safety and types: a schema
snapshot in the repository, an allowlist that cuts it down, a query check that refuses anything but one read-only
`query` within depth, alias, field and argument caps, a paced client, and the allowed schema rendered as TypeScript
so the answer is typed code. Root fields carry their notes and arguments as doc comments, so the model writes the
query from the types. See `references/graphql-tool.md`.

## Supporting info

- `references/graphql-tool.md`: the GraphQL-as-one-tool pattern, piece by piece.
- `references/hidden-knowledge.md`: what the installed source does that the docs do not say (code wrapping, transpile
  order, how `external_*` errors surface, serialisation, snippet binding names, binding validation, QuickJS limits,
  JSON Schema to type stubs).
- Docs: https://tanstack.com/ai/latest/docs/code-mode/code-mode and https://tanstack.com/ai/latest/docs/tools/server-tools
