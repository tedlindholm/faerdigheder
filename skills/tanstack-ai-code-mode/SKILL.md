---
name: tanstack-ai-code-mode
description: Build and tune TanStack AI Code Mode (execute_typescript, external_* tools, snippet_* bindings) with typed programmes, hand-declared tools, authored snippets and a small prompt. Use when adding a Code Mode agent, adding or declaring an external tool, writing snippets, or cutting the tokens of a Code Mode request. Includes what @tanstack/ai-code-mode does beyond its docs.
---

# TanStack AI Code Mode

Code Mode replaces a loop of tool calls with one `execute_typescript` call: the model writes a TypeScript programme
that awaits `external_<tool>()` functions inside an isolate. The tool result the model sees is
`{ success, result, logs }`. Read from `@tanstack/ai-code-mode` 0.5.3 (`packages/ai-code-mode`), `@tanstack/ai-code-mode-snippets` 0.4.25
(`packages/ai-code-mode-snippets`), `@tanstack/ai-isolate-quickjs` 0.3.2 (`packages/ai-isolate-quickjs`),
`@tanstack/ai-isolate-quickjs-bun` 0.1.2 (`packages/ai-isolate-quickjs-bun`) and `@tanstack/ai-isolate-node` 0.1.52
(`packages/ai-isolate-node`) on `main`. Behaviour comes from that source. The docs, and the skill shipped inside the
code-mode package, lag it. On another version, re-read that source before trusting `references/hidden-knowledge.md`.

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
   only the signatures a call is written from. A catalogue (a GraphQL allowlist, an OpenAPI spec) stays on the
   server and is returned into the sandbox by a tool the programme calls. The programme walks that value and builds
   the real call. The walk reaches the model only when the programme returns it. Generate both copies from one
   source so they cannot drift.
4. **Declare by hand what a schema cannot say.** A tool whose answer is typed by something richer than JSON Schema
   (a GraphQL schema, a discriminated union the converter flattens) gets a hand-written
   `declare function external_<name>(input: …): Promise<…>` in place of its generated stub, in both copies.
5. **Author snippets for repeated logic.** A `snippet_<name>` is a function you type-check and run, which the
   programme calls instead of rewriting the same loop every turn. Compile each once against the same declarations,
   run it in its own isolate with the same bindings and limits, and keep its declaration shorter than the code it
   replaces; a snippet is prompt cost on every request, so one that is rarely used is a loss. `register_snippet`
   stores the code it is given and does not run or type-check it. The trust badge leaves an untrusted snippet
   callable. Ship the snippet you tested.
6. **Allow another programme only when the first one did not call the API.** A compile rejection ran nothing. A
   programme that returned a catalogue slice named the fields and did not call. A programme that returned a refusal
   had its query turned down. Each of those gets one more programme. A programme that called the API and failed
   upstream ends the run. Use `agentLoopStrategy` for that.
7. **Measure before cutting tokens.** Capture one request body with a scripted adapter, split the system prompt by
   heading and declaration, and count characters per part; then cut the largest duplicate first. Pin a size budget in
   a test so the cut stays.
8. **Choose the discovery mechanism by call frequency.** If a catalogue is large and secondary tools are rarely
   called, mark them `lazy: true`: TanStack AI generates `discover_tools`, withholding stubs from the prompt while
   keeping bindings already loaded in the isolate. If tools are invoked on most runs, keep them eager: discovery
   costs an entire conversational round-trip. For sprawling API surfaces (GraphQL, REST catalogues), prefer an
   in-sandbox catalogue tool over `discover_tools`, so the programme inspects and calls endpoints within a single
   turn without round-tripping to the model.
9. **Partition tools by caller.** Pass low-level data fetchers and batch tools exclusively to
   `createCodeMode({ tools })` so the model cannot invoke them as turn-by-turn tool calls. Tools requiring
   interactive confirmation or human approval cannot pause mid-isolate execution; keep them directly callable in
   `chat({ tools })` and never expose them inside Code Mode.

## Token rules

- Each declaration appears once in the prompt.
- A tool description says what the instructions do not; a field description says what the name does not.
- Doc comments the model does not write a call from go to the compiler's copy only.
- No lazy tools when every tool is used every turn: discovery costs a request. A catalogue inside one programme is
  not a lazy tool. `discover_tools` returns stubs to the model; a catalogue tool returns data to the sandbox.
- Use `lazyToolsConfig: { includeDescription: 'first-sentence' }` when tools are lazy. The catalog values are
  `'none'` (the default, a bare name), `'first-sentence'` (through the first `.`, `!` or `?`), and `'full'`.
- A name written into the source is already in the model's copy, or it came back from an earlier programme. Code
  that runs later can use a value. It cannot change the source the model has already sent.
- Results are ids; code resolves them to records it already holds. A model-written return value is never data.
- `result` is the programme's return value. `logs` is every `console.log` line, and that array is in the tool
  result, so it enters the next prompt. The same lines are also emitted as `code_mode:console` through
  `emitCustomEvent`. Log a count.
- Pass a raw value from one `external_*` call to the next inside the same programme. Redact on the host when a later
  turn has to mention a value the model must not read.
- Keep tool schemas static for prompt caching: changing tool definitions between turns invalidates provider prompt
  caches. Pass evolving stubs or catalogues in conversation messages or fixed prompt blocks.
- Pass the tool's `abortSignal` into `fetch`. It is the chat run's signal. `throwIfAborted()` runs before the call
  starts. A call that has already started keeps running through a guest timeout and through `dispose`.
- Never nest code execution: provide direct typed stubs or in-sandbox catalogues; passing script strings into tool
  arguments causes double JSON escaping and prevents inner code from calling outer bindings.

## `@cloudflare/codemode` is a different package

Cloudflare's SDK (0.5.4, experimental) gives the model one `createCodeTool`. The programme calls `codemode.getWeather(...)` inside a Dynamic Worker (`DynamicWorkerExecutor`). `@cloudflare/codemode/tanstack-ai` adapts that tool to TanStack `chat()` and peers `@tanstack/ai` `>=0.8 <1`. This skill's stack is `@tanstack/ai-code-mode` on `@tanstack/ai` 0.69, with `execute_typescript` and `external_*`. `@tanstack/ai-isolate-cloudflare` is TanStack's Worker driver, not Cloudflare's SDK. See `references/code-mode-pattern.md`.

## A GraphQL API as one tool

Give the programme `external_graphql({ query, variables })` and `external_catalog(...)`. The allowlist stays on the
server. The model's copy is those two signatures. The programme walks the catalogue inside the sandbox, builds the
query from that value, and calls `external_graphql`. The compiler's copy still holds the rendered schema. See
`references/graphql-tool.md`.

## Supporting info

- `references/code-mode-pattern.md`: the Code Mode pattern, `@cloudflare/codemode` beside TanStack's packages,
  discovery mechanisms (lazy tools vs in-sandbox catalogues), and isolate sandboxing.
- `references/graphql-tool.md`: the GraphQL-as-one-tool pattern, piece by piece.
- `references/hidden-knowledge.md`: what the installed source does that the docs do not say (code wrapping, transpile
  order, how `external_*` errors surface, serialisation, snippet binding names, binding validation, QuickJS WASM,
  QuickJS Bun and Node isolate limits, JSON Schema to type stubs).
- Docs: https://tanstack.com/ai/latest/docs/code-mode/code-mode and https://tanstack.com/ai/latest/docs/tools/server-tools
