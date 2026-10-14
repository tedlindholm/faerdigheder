# What the installed source does beyond the docs

Read from `@tanstack/ai-code-mode` 0.5.2 (CM), `@tanstack/ai-code-mode-snippets` 0.4.24 (SN) and
`@tanstack/ai-isolate-quickjs` 0.3.2 (QJ) in the versions above. Line numbers are from those versions; re-read the
source after an upgrade.

## Execution order (CM/create-code-mode-tool.ts)

1. Input check (`name: 'ValidationError'`, L181).
2. `code_mode:execution_started { timestamp, codeLength }` (L198).
3. `transpile(typescriptCode)`, default `stripTypeScript` (L208). Any throw becomes `name: 'TypeScriptError'`,
   phase `transpile`. **Code Mode itself never type-checks**: sucrase only strips types. Type safety is yours to add
   through `transpile`, plus the Standard Schema parsing of each tool's input and output.
4. `getSnippetBindings()` is awaited on every execution, after transpile (L226).
5. Secret-name scan of bindings (warns only, L233).
6. Bindings merge as `{ ...staticBindings, ...snippetBindings }` (L243): **a snippet binding replaces an `external_*`
   binding of the same name.**
7. `driver.createContext` (phase `create-context`), `execute`, `dispose` in `finally`: a fresh isolate per call.
8. Every exit emits `code_mode:execution_finished { timestamp, durationMs, phase, success, logCount, error }`
   (L144-178). `error.line` exists in the result schema but is never filled (L313-327).
- `tools.length === 0` throws (L107): snippets alone need one real tool.
- Defaults: `timeout = 30000`, `memoryLimit = 128` (MB) (L96-97).
- Console lines are levelled by prefix `ERROR: `, `WARN: `, `INFO: ` and re-emitted as `code_mode:console` (L283-292).

## Code wrapping (CM/strip-typescript.ts, CM/code-wrapper.ts)

- `stripTypeScript` wraps the code in `async function ___TANSTACK_WRAPPER_START___() { … }` and runs sucrase with
  `transforms: ['typescript']`, `disableESTransforms: true`, then cuts the body back out (L54-116). So a custom
  `transpile` must accept top-level `return` and `await`.
- Sucrase limits (L26-35): `namespace`/`module` value blocks are dropped (`ReferenceError` at runtime); decorators and
  `accessor` pass through unchanged; `using` and RegExp `/v`, `/d` pass through and may fail in QuickJS.
- Sucrase positions are off by the wrapper's one line (L42-44); `wrapCode` adds about three more lines at runtime:
  ```js
  (async function() { try { const __userResult = await (async function() {
  ${code}
  })(); return JSON.stringify(__userResult); } catch (__error) { throw __error; } })()
  ```
  Top-level declarations are function-scoped, not globals. **The return value is `JSON.stringify`'d in the sandbox.**

## Crossing the boundary (QJ/isolate-driver.ts, CM/bindings/tool-to-binding.ts)

- Guest wrapper per binding (isolate-driver.ts:141-150):
  `async function ${name}(input) { const r = JSON.parse(await __${name}_impl(JSON.stringify(input))); if (!r.success) throw new Error(r.error); return r.value; }`
- **A tool's error reaches the programme as `new Error(message)`**: name, stack and custom fields are lost. Encode the
  kind in the message if the programme must tell errors apart.
- Everything is JSON both ways: `Date` → ISO string, `undefined` dropped, `Map`/`Set` → `{}`, BigInt or cycles throw.
  Calling `external_x()` with no argument sends the string `"undefined"`, which fails `JSON.parse`: always pass an object.
- Binding names become `async function ${name}` plus a global `__${name}_impl` (L136): a name that is not a JS
  identifier fails `createContext` ("Failed to create wrapper for …"). The `__*_impl` globals are visible to the guest.
- `toolToBinding` (tool-to-binding.ts:36-96): no schema → `{ type: 'object', properties: {} }`; missing `execute`
  throws; Standard Schema input and output are parsed, failing as `Input validation failed for tool <name>: …` /
  `Output validation failed …` (name without `external_`). Zod defaults and transforms therefore apply to the input.
- `createEventAwareBindings` (L110-161) emits `code_mode:external_call`, then `external_result` or `external_error`,
  calls `abortSignal?.throwIfAborted()` before each call, and passes nested tools only `{ context, abortSignal,
  emitCustomEvent }`: no `toolCallId`, no `inputResponse`.

## QuickJS driver (QJ)

- Config: `timeout` (30000), `memoryLimit` in MB, `maxStackSize` (512 KiB, driver-level only, no per-context override,
  L218), `wasmLocation`. Per-context `timeout`/`memoryLimit` from Code Mode win over driver defaults.
- Sync WASM build (`RELEASE_SYNC`); host calls bridged with QuickJS promises (L71-79).
- Globals: `console.log/error/warn/info` and the bindings. No `console.debug` (throws), no timers, no `fetch`,
  no `require`. `console.log(obj)` goes through `vm.getString`, so stringify objects yourself. Logs are cleared at the
  start of each `execute()` (isolate-context.ts:144).
- Timeout: interrupt handler plus `awaitWithDeadline` (isolate-context.ts:40-80). It is terminal for the context;
  pending host calls are settled as `{ success: false, error: 'Execution timed out' }` after `CANCEL_GRACE_MS = 100`.
  **The host tool keeps running**; only `abortSignal` in your tools stops it.
- Error normalisation (error-normalizer.ts): "out of memory"/"memory alloc" → `MemoryLimitError`; "stack overflow" →
  `StackOverflowError`; `InternalError: interrupted` → `TimeoutError`; `RuntimeError … unreachable` → `WasmRuntimeError`.
  Memory and stack errors dispose the VM.
- Result decoding (isolate-context.ts:253-265): the dumped value is `JSON.parse`d; on failure the raw string is kept.
  Returning nothing, `undefined` or a function gives `result: undefined`.
- Uncaught errors in async jobs after a host promise settles are not thrown; they land in the logs as
  `ERROR: uncaught error in sandboxed code: …` (isolate-driver.ts:117-124).
- `execute()` calls on one context are queued; `dispose()` cancels pending host calls first (L291-326).

## Type stubs from JSON Schema (CM/type-generator/json-schema-to-ts.ts)

- Names: `${capitalize(name)}Input`/`Output`, first letter only (`External_getUserInput`). Order follows the tool array:
  input interface, output interface, `declare function`.
- A named `interface` only for a root `type: 'object'` with properties and no `enum`/`const`; otherwise inline.
- **No `outputSchema` → `Promise<unknown>`** (L45). Typed returns need an `outputSchema`.
- `const` → literal; `enum` → union; string/number/integer/boolean/null direct; `array` → `Array<item>` (`unknown`
  without `items`; tuples unsupported); objects with `properties` → inline literal, non-required get `?`;
  `anyOf`/`oneOf` → union only when `type` is absent. A `type` array maps `object` → `object`, `array` → `Array<unknown>`.
- **Becomes `unknown`:** objects without `properties` (records), `additionalProperties`, `patternProperties`,
  `$ref`/`$defs`, `allOf`, `not`, `if/then`, tuples. `format`, `minimum`, `default`, `nullable`, `readOnly` are ignored.
- Property descriptions become JSDoc with `*/` escaped; the function description (L59-61) is **not** escaped.
- Snippet stubs use an older generator (SN/generate-snippet-types.ts:6-82): `enum` after `type` (so a string enum
  is `string`), no `const`, no property descriptions, names `Snippet${PascalCase}Input`, hints as `@hint` tags.
- The Code Mode system prompt (CM/create-system-prompt.ts) is advisory text only; stubs are generated for eager tools.
  `discover_tools` accepts names with or without `external_` (create-discovery-tool.ts:37-41, 91-96).

## Secret-name scan (CM/validate-bindings.ts)

Walks `properties`, `items`, `additionalProperties`, `anyOf`/`oneOf`/`allOf` and local `$ref`s. Word matches after
splitting camelCase/`_`/`-`: `password passwd pwd passcode secret token credential(s) authorization jwt bearer`;
substring matches: `apikey accesskey authkey privatekey clientsecret webhooksecret`. Default handler `'warn'`
(logger's `warn` or `console.warn`); only `'throw'` rejects. Deduplicated by `toolName::path`.

## Snippets (SN)

- Two execution paths:
  - `codeModeWithSnippets`'s `getSnippetBindings` (code-mode-with-snippets.ts:86-130): `storage.loadAll()` on every
    execution (all stored snippets, not only selected), defined as `snippet_<name>`, body prefixed with
    `const input = ${JSON.stringify(input)};`, `stripTypeScript` regardless of your `transpile`, run in a **nested
    isolate whose bindings are only `external_*`**, so **a snippet cannot call another `snippet_*`**; `dependsOn` is
    metadata. No events, no stats on this path.
  - `snippetToTool` (snippets-to-tools.ts:155-292): registers each snippet as a top-level tool by bare name (clashes
    possible), description prefixed `[SNIPPET] `, minimal JSON Schema → Zod converter (enum/union/const →
    `z.unknown()`), **`console.log`s inputs and code** (data in server logs), emits `code_mode:snippet_call/result/error`.
    Its `memoryLimit` comment says bytes; it is MB.
- `snippetsToBindings` (legacy) uses the same `const input = …` wrapping with a caller-supplied `executeInSandbox`;
  `snippetsToSimpleBindings` makes bindings that always reject, for stub generation only.
- Selection (select-relevant-snippets.ts): last 5 messages, catalogue of name + description + first hint, JSON array
  reply, at most `maxSnippetsInContext` (5), any failure → `[]`. Selection affects the prompt only; path (a) still
  exposes every stored snippet.
- Management tools: `register_snippet` validates `/^[a-z][a-z0-9_]*$/`, rejects `external_`/`snippet_` prefixes and
  duplicates, takes schemas as JSON strings, **never runs or type-checks the code**.
- Trust (trust-strategies.ts): untrusted → provisional (≥10 runs, ≥0.9) → trusted (≥100, ≥0.95); relaxed 3/0.8 then
  10/0.9; one level at a time, never demotes. **Trust changes only the prompt badge**; nothing blocks an untrusted snippet.
- Storage: `loadIndex`, `loadAll`, `get`, `save`, `delete`, `search`, `updateStats`, optional `trustStrategy`. Memory
  storage is a Map with no name validation. File storage (`/storage`, Node): `_index.json` + `<name>/meta.json` +
  `<name>/code.ts`, names `/^[A-Za-z0-9_-]+$/`, non-atomic writes, index read-modify-write can race.

## Agent store (CM/agent-store.ts)

`AgentSession`, `AgentStore { get, set, delete, list }`, `InMemoryAgentStore` (Map, no TTL). `generateAgentName()` is
`agent_` + 8 hex chars from `Math.random`. Nothing in these packages uses it.
