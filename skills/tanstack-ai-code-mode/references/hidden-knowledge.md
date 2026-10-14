# What the installed source does beyond the docs

Read from `@tanstack/ai-code-mode` 0.5.3 (CM), `@tanstack/ai-code-mode-snippets` 0.4.25 (SN),
`@tanstack/ai-isolate-quickjs` 0.3.2 (QJ), `@tanstack/ai-isolate-quickjs-bun` 0.1.2 (QB) and
`@tanstack/ai-isolate-node` 0.1.52 (ND) on `main`: `packages/ai-code-mode`, `packages/ai-code-mode-snippets`,
`packages/ai-isolate-quickjs`, `packages/ai-isolate-quickjs-bun`, `packages/ai-isolate-node`. Those versions match
the published packages. Line numbers are from that source; re-read it after an upgrade. The docs and
`packages/ai-code-mode/skills/ai-code-mode` lag this source.

## `createCodeMode` (CM/create-code-mode.ts)

Returns `{ tool, discoveryTool, tools, systemPrompt }` (L39-44). `tools` is `[execute_typescript]`, or that plus
`discover_tools` when any tool is `lazy`. `discoveryTool` is otherwise `null`. `tool` and `systemPrompt` remain.
Spread `tools` into `chat({ tools })`.

Config on `CodeModeToolConfig` (CM/types.ts): `timeout` 30000, `memoryLimit` 128 (MB), `getSnippetBindings`,
`onSecretParameter`, `lazyToolsConfig` (default `{ includeDescription: 'none' }`), `transpile` (default
`stripTypeScript`), `debug` (same resolution as `chat({ debug })`). Unset `debug` logs failures under `errors`.
`false` silences them. `true` also logs one success line under `tools`.

## Execution order (CM/create-code-mode-tool.ts)

Once, when the tool is created: `tools.length === 0` throws (L107). Static bindings are built and scanned for
secret-like names (L111-122). Defaults `timeout = 30000`, `memoryLimit = 128` (L96-97). `transpile` defaults to
`stripTypeScript` (L100).

Each execution:

1. An empty `typescriptCode` returns `name: 'ValidationError'`, phase `validate-input` (L181-191). That emits
   `code_mode:execution_finished` and does not emit `execution_started`.
2. `code_mode:execution_started { timestamp, codeLength }` (L198).
3. `transpile(typescriptCode)` (L208). Any throw becomes `name: 'TypeScriptError'`, phase `transpile`, and the
   thrown stack is copied. **Code Mode itself never type-checks**: sucrase only strips types. Type safety is yours
   to add through `transpile`, plus the Standard Schema parsing of each tool's input and output.
4. `getSnippetBindings()` is awaited on every execution, after transpile (L226).
5. Secret-name scan of the snippet bindings only, when there are any (L233-239). The dedup cache is shared with the
   static scan and lives for the tool instance.
6. Bindings merge as `{ ...staticBindings, ...snippetBindings }` (L243): **a snippet binding replaces an `external_*`
   binding of the same name.**
7. `createEventAwareBindings`, then `driver.createContext` (phase `create-context`), `execute`, `dispose` in
   `finally`: a fresh isolate per call (L244-346).
8. Console lines are levelled by prefix `ERROR: `, `WARN: `, `INFO: ` and re-emitted as `code_mode:console` after
   `execute`, before finish (L277-299).
9. Every exit through `finish` emits `code_mode:execution_finished { timestamp, durationMs, phase, success,
   logCount, error }` (L144-178). `error.stack` is copied when present. `error.line` is on the result schema and
   on this payload, and the execute path never sets it (L313-327). `stripTypeScript` warns that a sucrase position
   is off by the wrapper line (strip-typescript.ts L42-44); that number is not written onto the result.

## Code wrapping (CM/strip-typescript.ts, CM/code-wrapper.ts)

- `stripTypeScript` wraps the code in `async function ___TANSTACK_WRAPPER_START___() { … }` and runs sucrase with
  `transforms: ['typescript']`, `disableESTransforms: true`, then cuts the body back out (L54-115). So a custom
  `transpile` must accept top-level `return` and `await`. The snippet helpers call `stripTypeScript` directly and
  ignore `transpile` (types.ts, the `transpile` note).
- Sucrase limits (L26-35): `namespace`/`module` value blocks are dropped (`ReferenceError` at runtime); decorators
  and `accessor` pass through unchanged; `using` and RegExp `/v`, `/d` pass through and may fail in QuickJS.
- `wrapCode` adds about three more lines at runtime (code-wrapper.ts L12-23):
  ```js
  (async function() { try { const __userResult = await (async function() {
  ${code}
  })(); return JSON.stringify(__userResult); } catch (__error) { throw __error; } })()
  ```
  Top-level declarations are function-scoped, not globals. **The return value is `JSON.stringify`'d in the sandbox.**

## Crossing the boundary (QJ/isolate-driver.ts, CM/bindings/tool-to-binding.ts)

- Guest wrapper per binding (isolate-driver.ts L141-149):
  `async function ${name}(input) { const resultJson = await __${name}_impl(JSON.stringify(input)); const result = JSON.parse(resultJson); if (!result.success) throw new Error(result.error); return result.value; }`
- Host `invokeBinding` (L57-68) catches and returns `{ success: false, error: message }`. **A tool's error reaches
  the programme as `new Error(message)`**: name, stack and custom fields are lost. Encode the kind in the message
  if the programme must tell errors apart.
- Everything is JSON both ways: `Date` → ISO string, `undefined` dropped, `Map`/`Set` → `{}`, BigInt or cycles throw.
  On this WASM driver, calling `external_x()` with no argument stringifies `undefined`, and the host `JSON.parse`
  then fails. The Bun and Node drivers coerce a missing argument to `{}` (see those sections). Pass an object.
- Binding names become `async function ${name}` plus a global `__${name}_impl` (L136): a name that is not a JS
  identifier fails `createContext` ("Failed to create wrapper for …", L155). The `__*_impl` globals are visible to
  the guest.
- `toolToBinding` (tool-to-binding.ts L36-96): no schema → `{ type: 'object', properties: {} }`; missing `execute`
  throws; Standard Schema input and output are parsed, failing as `Input validation failed for tool <name>: …` /
  `Output validation failed …` (name without `external_`). Zod defaults and transforms therefore apply to the input.
- `createEventAwareBindings` (L110-160) emits `code_mode:external_call`, then `external_result` or `external_error`,
  calls `abortSignal?.throwIfAborted()` before each call, and passes nested tools only `{ context, abortSignal,
  emitCustomEvent }`: no `toolCallId`, no `inputResponse`.

## QuickJS driver (QJ)

- Config (isolate-driver.ts L26-50): `timeout` (30000), `memoryLimit` in MB (128), `maxStackSize` (512 KiB),
  `wasmLocation`. Per-context `timeout` and `memoryLimit` from Code Mode win over the driver defaults (L216-217).
  `maxStackSize` stays the driver default (L218): there is no per-context override.
- Sync WASM build. `getQuickJS()` when `wasmLocation` is omitted (L205); `newVariant(RELEASE_SYNC, { wasmLocation })`
  when it is set (L208-209). Host calls are bridged with QuickJS promises, not asyncify (L71-78, L220-222).
- Globals: `console.log/error/warn/info` and the bindings (L249-257). No `console.debug` (throws), no timers, no
  `fetch`, no `require`. `console.log(obj)` goes through `vm.getString` (L241), so stringify objects yourself. Logs
  are cleared at the start of each `execute()` (isolate-context.ts L144).
- Timeout: interrupt handler (isolate-driver.ts L281) plus `awaitWithDeadline` (isolate-context.ts L40-79). It is
  terminal for the context. Pending host calls are settled as `{ success: false, error: 'Execution timed out' }`
  (isolate-driver.ts L102-104) after `CANCEL_GRACE_MS = 100` (isolate-context.ts L28). **The host tool keeps
  running**; only `abortSignal` in your tools stops it.
- Error normalisation (error-normalizer.ts L26-60): "out of memory"/"memory alloc" → `MemoryLimitError`; "stack
  overflow" → `StackOverflowError`; `InternalError: interrupted` → `TimeoutError`; `RuntimeError … unreachable` →
  `WasmRuntimeError`. Memory and stack errors dispose the VM (isolate-context.ts L152-170).
- Result decoding (isolate-context.ts L257-265): a dumped string is `JSON.parse`d; on failure the raw string is
  kept. Returning nothing, `undefined` or a function gives `result: undefined`.
- Uncaught errors in async jobs after a host promise settles are not thrown; they land in the logs as
  `ERROR: uncaught error in sandboxed code: …` (isolate-driver.ts L117-123).
- `execute()` calls on one context are queued (isolate-context.ts L119-127); `dispose()` settles pending host calls
  before freeing the VM (L291-325).

## QuickJS Bun driver (QB)

Native QuickJS through `quickjs-bun` 0.1.2 (pinned exactly) and `bun:ffi`. `engines.bun` is `>=1.3.14`.
`createContext` throws when `Bun` is undefined (isolate-driver.ts L217-221).

- **Not an OS sandbox.** The source says QuickJS is compiled by TinyCC and runs in the host process address space.
  The memory limit is QuickJS `JS_SetMemoryLimit` accounting. The same comment points at the Node driver (a separate
  V8 isolate) or the WASM driver (linear memory) for a stronger boundary (L165-171).
- The QuickJS library loads once per process. A failed load is not cached (L114-122). Each context gets its own
  `JSRuntime`, so heap, stack and job queue are independent of other contexts (L231-238).
- Config: `timeout` 30000, `memoryLimit` 128 MB, `maxStackSize` 512 KiB, `maxToolCalls` 1000
  (isolate-context.ts L58). Per-context `timeout` (at least 1 ms, L224) and `memoryLimit` win over the driver
  defaults. `maxStackSize` and `maxToolCalls` stay the driver config (L226-227, L207): Code Mode's `IsolateConfig`
  cannot override them.
- A call past `maxToolCalls` throws inside the sandbox before the host runs (`Exceeded the maximum of N tool calls
  per execution`, isolate-context.ts L460-464). The timeout still bounds wall-clock time.
- Guest wrapper is a factory, not a string with the binding name interpolated (L88-97, L413-429):
  `async function (input) { const resultJson = await impl(JSON.stringify(input ?? {})); … throw new Error(result.error); }`.
  A missing argument is `{}`. A result that `JSON.stringify` cannot encode becomes
  `Tool result is not JSON-serializable: …` (L486-492). If dumping the arguments throws, the host tool is not
  called (L516-533).
- Console is `log`/`error`/`warn`/`info`, prefixed like the WASM driver. Arguments go through `ToString`
  (`coerceToString`, L377-388); a value that cannot be coerced becomes `[unprintable]`. Logs stop at 10,000 entries
  or 1,000,000 UTF-16 code units, then one `[log output truncated]` line (L51-55, L393-404).
- Timeout is `evalCode({ timeoutMs })` plus a deadline around async continuations (L238-276). In-flight host calls
  are abandoned when the run ends (L205-207, L572-577). **`binding.execute` that already started keeps running**;
  only `abortSignal` in the tool stops it.
- Errors: quickjs-bun `TimeoutError`, or `InternalError` whose message is exactly `interrupted`, becomes
  `TimeoutError` (error-normalizer.ts L58-69). Memory and stack names match the WASM driver. A bare `null`
  exception (heap too exhausted to allocate an Error) becomes `MemoryLimitError` (isolate-context.ts L598-603).
  Fatal memory and stack errors dispose the runtime (L585-588).

## Node driver (ND)

`isolated-vm` `^6.0.2`. `engines.node` is `>=22`. `createNodeIsolateDriver({ memoryLimit, timeout, skipProbe })`.

- Unless `skipProbe` is set, the first call spawns `process.execPath` with no extra flags, builds an 8 MB isolate,
  and caches the result (isolate-driver.ts L42-74, L122-131). A failed probe throws. The source does not pass
  `--no-node-snapshot`; the package README tells you to pass that flag when starting Node.
- Per-context `timeout` (30000) and `memoryLimit` (128 MB) win over the driver defaults (L134-140). There is no
  stack-size option, no tool-call cap, and no log cap.
- Guest wrapper (L216-228): `async function ${name}(input) { … JSON.stringify(input ?? {}) … throw new Error(result.error) }`.
  A missing argument is `{}`. The name is interpolated into evaluated source, and `__${name}_ref` is visible on the
  global. A non-identifier name fails that eval.
- `console.log/error/warn/info` `JSON.stringify` objects (L164-190). No `console.debug`.
- `execute` compiles `wrapCode(code)` and runs it with `isolated-vm`'s `{ timeout, promise: true }` (isolate-context.ts
  L44-54). A string result is `JSON.parse`d (L56-66). There is no per-context execution queue.
- `normalizeError` keeps the thrown name, message, stack and errno `code` (error-normalizer.ts L6-14). It does not
  rename timeouts or memory failures to `TimeoutError` / `MemoryLimitError`.
- `dispose` releases the context and the isolate (L82-88). The source does not cancel an in-flight `binding.execute`
  when the script times out.

## Type stubs from JSON Schema (CM/type-generator/json-schema-to-ts.ts)

- Names: `${capitalize(name)}Input`/`Output`, first letter only (`External_getUserInput`, L207-208). Order follows
  the tool array: input interface, output interface, `declare function`.
- A named `interface` only for a root `type: 'object'` with properties and no `enum`/`const` (L91-101); otherwise
  inline.
- **No `outputSchema` → `Promise<unknown>`** (L45). Typed returns need an `outputSchema`.
- `const` wins over `enum`, and both win over `type` (L122-128); string/number/integer/boolean/null direct;
  `array` → `Array<item>` (`unknown` without `items`; tuples unsupported, L140-145); objects with `properties` →
  inline literal, non-required get `?`; `anyOf`/`oneOf` → union only when `type` is absent (L177-182), because a
  present `type` returns first. A `type` array maps `object` → `object`, `array` → `Array<unknown>` (L186-197).
- **Becomes `unknown`:** objects without `properties` (records), `additionalProperties`, `patternProperties`,
  `$ref`/`$defs`, `allOf`, `not`, `if/then`, tuples (L201). `format`, `minimum`, `default`, `nullable`, `readOnly`
  are ignored.
- Property descriptions become JSDoc with `*/` escaped (L166-168); the function description (L59-61) is **not**
  escaped.
- Snippet stubs use an older generator (SN/generate-snippet-types.ts L6-81): `enum` after `type` (so a string enum
  is `string`), no `const`, no property descriptions, names `Snippet${PascalCase}Input`, hints as `@hint` tags
  (L150-157).
- The Code Mode system prompt (CM/create-system-prompt.ts) is advisory text only; stubs are generated for eager
  tools. `discover_tools` accepts names with or without `external_` (create-discovery-tool.ts L37-40, L91-92). The
  lazy bindings are already in the sandbox; discovery only reveals the stubs (L44-48).

## Secret-name scan (CM/validate-bindings.ts)

Walks `properties`, `items`, `additionalProperties`, `anyOf`/`oneOf`/`allOf` and local `$ref`s under `$defs` or
`definitions` (L103-142). Word matches after splitting camelCase/`_`/`-`: `password passwd pwd passcode secret
token credential(s) authorization jwt bearer` (L8-18); substring matches: `apikey accesskey authkey privatekey
clientsecret webhooksecret` (L27-34). `onSecretParameter` defaults to `'warn'` (L170), through the `debug` logger's
`warn` when a logger is passed, otherwise `console.warn`. `'throw'` rejects. `'ignore'` skips the scan. A function
receives each match. Deduplicated by `toolName::path` (L184).

## Snippets (SN)

- Two execution paths:
  - `codeModeWithSnippets`'s `getSnippetBindings` (code-mode-with-snippets.ts L86-130): `storage.loadAll()` on every
    execution (all stored snippets, not only selected), defined as `snippet_<name>`, body prefixed with
    `const input = ${JSON.stringify(input)};`, `stripTypeScript` regardless of your `transpile`, run in a **nested
    isolate whose bindings are only `external_*`**, so **a snippet cannot call another `snippet_*`**. `dependsOn` is
    metadata on `register_snippet` (create-snippet-management-tools.ts L181-185). The nested isolate's event emitter
    is a no-op (L107); the caller's tool context, including `abortSignal`, is forwarded (L105-108). No stats on this
    path.
  - `snippetToTool` (snippets-to-tools.ts L155-292): registers each snippet as a top-level tool by bare name (clashes
    possible), description prefixed `[SNIPPET] ` (L169), minimal JSON Schema → Zod converter (a handled `type` wins,
    so a string enum is `z.string()`; `enum`/`anyOf`/`const` without a handled `type` fall through to `z.unknown()`,
    L96-148), **`console.log`s inputs and code** (L186-236, data in server logs), emits
    `code_mode:snippet_call/result/error`. Its `memoryLimit` comment says bytes (L51-53, L86-88); the value is passed
    to `createContext`, which treats it as MB.
- `snippetsToBindings` (legacy) uses the same `const input = …` wrapping with a caller-supplied `executeInSandbox`;
  `snippetsToSimpleBindings` makes bindings that always reject, for stub generation only (snippets-to-bindings.ts
  L112-134).
- Selection (select-relevant-snippets.ts): last 5 messages (L46-47), catalogue of name + description + first hint
  (L71-75), JSON array reply, at most `maxSnippetsInContext` (default 5, sliced at L127), any failure → `[]`
  (L131-134). Selection affects the prompt and which snippets are registered as tools. Path (a) still exposes every
  stored snippet as a `snippet_*` binding.
- Management tools: `register_snippet` validates `/^[a-z][a-z0-9_]*$/` (L151), rejects `external_`/`snippet_`
  prefixes (L222-229), takes schemas as JSON strings, **never runs or type-checks the code**. On success it adds the
  snippet to the registry immediately (L260-270).
- Trust (trust-strategies.ts): untrusted → provisional (≥10 runs, ≥0.9, L35-40) → trusted (≥100, ≥0.95, L43-48);
  relaxed 3/0.8 then 10/0.9 (L82-95); one level at a time, never demotes. **Trust changes only the prompt badge**;
  nothing blocks an untrusted snippet.
- Storage: `loadIndex`, `loadAll`, `get`, `save`, `delete`, `search`, `updateStats`, optional `trustStrategy`. Memory
  storage (`createMemorySnippetStorage`, root export) is a Map with no name validation. File storage
  (`createFileSnippetStorage` from `@tanstack/ai-code-mode-snippets/storage`, Node only): `_index.json` +
  `<name>/meta.json` + `<name>/code.ts`, names `/^[A-Za-z0-9_-]+$/` (file-storage.ts L56), non-atomic writes, index
  read-modify-write can race (L160-176).

## Agent store (CM/agent-store.ts)

`AgentSession`, `AgentStore { get, set, delete, list }`, `InMemoryAgentStore` (Map, no TTL). `generateAgentName()` is
`agent_` + 8 hex chars from `Math.random` (L38-42). Nothing in these packages uses it.
