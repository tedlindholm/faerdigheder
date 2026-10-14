# Code Mode patterns in TanStack AI

Code Mode replaces sequential, turn-by-turn tool-calling loops with sandboxed programme execution:
the model writes a complete TypeScript programme that orchestrates tools directly inside an isolate.
In `@tanstack/ai-code-mode`, `execute_typescript` evaluates the script and returns `{ success, result, logs }`
to the model. `result` is the programme's return value; `logs` is an array of captured console output.

First formulated at scale by Cloudflare (`@cloudflare/codemode`) and agent harnesses like Pi, this architecture
addresses the token and latency limits of traditional JSON tool calling. This guide explains how to apply
these patterns when building and tuning Code Mode agents with TanStack AI (`@tanstack/ai-code-mode`).

---

## Why Code Mode in TanStack AI

When tools are passed directly to TanStack AI's `chat({ tools })`, the agent loop follows a standard multi-turn cycle:
`prompt → model JSON tool call → host executes tool → tool result enters message history → next prompt`.

This approach breaks down for complex workflows:
1. **Context bloat from intermediate payloads:** Every tool response is added to the conversation history. If a tool
   fetches 300 database rows or a large API payload, thousands of tokens are consumed just so the model can inspect two fields.
2. **Turn latency:** Chaining five tools requires five round-trips to the model.
3. **Clumsy control flow:** Loops, branch conditions, data transformations, and parallel operations (`Promise.all`)
   cannot be written natively. The model must simulate control flow turn-by-turn.
4. **LLM pre-training alignment:** Foundation models are trained on massive corpuses of source code. They write
   valid TypeScript with standard control flow far more reliably than they navigate multi-turn JSON calling schemas.

In TanStack AI Code Mode, intermediate outputs remain inside the guest isolate. Only the final return value and
console logs cross back into the conversation context.

---

## Applying the Cloudflare 1,000-token API pattern in TanStack AI

Cloudflare proved that an API with 2,500+ endpoints can be presented to an agent in roughly 1,000 tokens of
TypeScript declarations by keeping the full API catalogue behind discovery and execution tools.

In TanStack AI, registering dozens or hundreds of standard `toolDefinition`s inflates the prompt and degrades tool
selection accuracy. Instead, apply the Cloudflare pattern inside `@tanstack/ai-code-mode`:

* **Do not register a tool per endpoint.** Never create 50 separate tool definitions for a wide REST or GraphQL API.
* **Expose one catalogue tool and one execution tool.** For example, declare `external_catalog` (which returns a slice
  of endpoints, types, or fields) and `external_graphql` (or `external_api`).
* **The programme walks the catalogue in the sandbox.** In a single turn, the model writes a programme that awaits
  `external_catalog()`, iterates the slice in isolate memory, formats the required query or payload, and calls the
  execution tool.
* **The API catalogue stays in the sandbox.** The catalogue data never enters the LLM conversation context unless the
  programme explicitly returns it.
* **Edge sandboxing via Cloudflare Workers:** When deploying on Cloudflare, use `@tanstack/ai-isolate-cloudflare`
  (0.2.43). The programme runs inside an edge Worker isolate, keeping tool callbacks on the host while benefiting
  from near-zero cold starts.

### `@cloudflare/codemode` (0.5.4)

Cloudflare ships the same idea as its own SDK, from `cloudflare/agents` `packages/codemode`. The npm page marks it experimental. It is not `@tanstack/ai-code-mode`, and it is not `@tanstack/ai-isolate-cloudflare`.

The model receives one tool from `createCodeTool`. It writes a function whose calls look like `codemode.getWeather({ location })`. `DynamicWorkerExecutor` runs that function in a Dynamic Worker (`env.LOADER`). Types for the prompt are generated from the tools.

Three entry points:

* `@cloudflare/codemode` has no framework peer. `executor.execute` runs code against a `ToolProvider`.
* `@cloudflare/codemode/ai` is the Vercel AI SDK wrapper.
* `@cloudflare/codemode/tanstack-ai` exports `createCodeTool` and `tanstackTools()` for TanStack `chat()`. Its peer is `@tanstack/ai` `>=0.8 <1`. The packages this skill read peer `@tanstack/ai` 0.69, so the adapter does not drop onto that stack.

Discovery stays in the sandbox as `codemode.search` and `codemode.describe`. A host that is not the AI SDK calls `runtime.search`, `runtime.describe`, and `runtime.execute`. An `OpenApiConnector` reads the spec once on the host and exposes one method per operation (`stripe.CreatePaymentIntent`), plus `request` as an escape hatch. An `McpConnector` exposes one method per MCP tool. A method with `requiresApproval` pauses `execute` until the host approves or rejects it.

Use TanStack's `execute_typescript` and `external_*` for the stack this skill documents. Use `@cloudflare/codemode` when the host is a Worker and you want Cloudflare's tool, namespaces, and connectors.

---

## Sandbox drivers and execution boundaries in TanStack AI

A fundamental architectural distinction in TanStack AI Code Mode is separating where the orchestration script runs
from where target operations execute:

* **The harness isolate (coordination):**
  The guest sandbox evaluates the model's programme. In TanStack AI, this is powered by pluggable isolate drivers:
  * `@tanstack/ai-isolate-quickjs` (0.3.2): WebAssembly QuickJS. Linear memory isolation with no host dependencies.
  * `@tanstack/ai-isolate-quickjs-bun` (0.1.2): Native QuickJS via `bun:ffi` for high-throughput Bun environments.
  * `@tanstack/ai-isolate-node` (0.1.52): V8 isolate via `isolated-vm` for Node `>=22`.
  * `@tanstack/ai-isolate-cloudflare` (0.2.43): Cloudflare Worker isolate.
  * `@tanstack/ai-isolate-daytona` (0.1.3) & `@tanstack/ai-isolate-e2b` (0.1.1): Dedicated cloud containers.
  The QuickJS and Node guest environments have strict boundaries: `console` and registered bindings are injected;
  the host filesystem, timers (`setTimeout`), and `fetch` are not.
* **The target environment (execution):**
  Where actual system effects occur (databases, external HTTP APIs, local file modifications, or shell execution).
  Host tools bridge the isolate to this environment.

### Why shell / bash tools alone are insufficient

While a host `external_bash` tool can run external processes, Code Mode scripts inside TanStack AI provide native
coordination for capabilities that CLI tools cannot handle cleanly:
1. **Multimodal protocol payloads:** A shell command cannot inject structured image or audio blocks into the LLM
   conversation protocol. In TanStack AI, host tools can process media and surface structured content directly.
2. **Sub-agent lifecycle:** A script can spawn, monitor, and await child agents via typed host tool bindings without
   fragile IPC over environment variables or Unix sockets.
3. **Auxiliary and non-LLM models:** Fast classification, embeddings, or image generation can be bound as typed host
   tools, letting the script process data through auxiliary models without bootstrapping separate runtime processes.

---

## What survives a run in TanStack AI

Understanding isolate lifecycle prevents subtle state bugs:

* **QuickJS and Node isolates are ephemeral:** `createCodeModeTool` creates a fresh isolate context for each
  `execute_typescript` call and disposes it in a `finally` block. A guest programme cannot leave files in memory
  or schedule deferred work with timers.
* **What crosses to the next turn:**
  1. **Return values and logs:** `{ success, result, logs }` is JSON-stringified into the tool message in `chat()`.
     The model sees `result` and `logs` on the next turn.
  2. **Authored snippets (`@tanstack/ai-code-mode-snippets`):** Tested, type-checked functions stored in memory or
     file storage that are bound into future isolates as `snippet_<name>` functions.
  3. **Host session storage:** If a programme produces a large dataset (such as an analyzed catalogue or batch results)
     that a later turn might need, store it on the host (e.g. keyed by run ID) and return only an ID to the model.
     A subsequent programme passes that ID to an `external_*` tool to retrieve the dataset inside the isolate.
  4. **Container drivers (Daytona / E2B):** Unlike isolate drivers, container sandboxes persist files and installed
     dependencies across executions within the same sandbox session.

---

## Discovery mechanisms in TanStack AI: lazy tools vs in-sandbox catalogues

As an agent's tool set expands, exposing every tool stub upfront inflates the system prompt. TanStack AI provides
two distinct discovery mechanisms:

### 1. TanStack AI Lazy Tool Discovery (`discover_tools`)

Marking a tool definition `lazy: true` withholds its TypeScript declaration from the initial system prompt:
* **Sibling tool:** `createCodeMode` exposes `discover_tools({ toolNames: string[] })` alongside `execute_typescript`.
* **Prompt catalogue configuration:** `lazyToolsConfig: { includeDescription: 'first-sentence' }`. Options are
  `'none'` (bare names), `'first-sentence'` (text through the first `.`, `!` or `?`), and `'full'` (complete description).
* **Bindings are already active in the isolate:** Lazy bindings are compiled and present in the sandbox from the start.
  `discover_tools` only returns TypeScript stubs (`declare function external_<name>(input: …): Promise<…>`) to the
  model's conversation history so the model knows the types for its next turn.
* **The round-trip cost:** Discovery costs a full conversational round-trip:
  `Turn 1 (discover_tools) → Turn 2 (stubs returned) → Turn 3 (execute_typescript)`.
  Compare the stub's token size on every request against that extra turn on requests that need the tool. Measure both.
  A hot-path tool whose stub is small stays eager.

### 2. In-sandbox catalogues (`external_catalog`)

For large, structured domains (GraphQL schemas, OpenAPI specifications, SQL tables), in-sandbox catalogues avoid
the discovery round-trip entirely:
* The model receives two static stubs: `external_catalog` and `external_graphql` (or `external_execute`).
* In **one turn**, the model writes a programme that inspects the catalogue and calls the execution tool.
* No extra round-trip is spent, and the schema never enters conversation history.

### Discovery decision matrix

| Scenario | Recommended TanStack AI pattern | Rationale |
| :--- | :--- | :--- |
| **The programme must name the tool on the first `execute_typescript`, and the stub is small** | **Eager tools** (default) | The declaration is already in the prompt. Discovery would insert a turn before that programme can be written. |
| **The stub is large and the programme can wait a turn** | **Lazy tools** (`lazy: true` + `discover_tools`) | The prompt lists a name. The model pays one turn for the stub, then writes the programme. |
| **One API surface the programme can walk (GraphQL, OpenAPI, SQL)** | **In-sandbox catalogue** (`external_catalog`) | The programme reads the slice and calls the API in the same turn. |

---

## Tool governance in TanStack AI: partitioning and approvals

Not every tool belongs in Code Mode, and not every tool belongs in the direct tool-calling menu:

1. **Code-only tools (`external_*`):**
   Low-level data fetchers, paginated queries, and batch operations should be passed exclusively to
   `createCodeMode({ tools })`. Withholding them from `chat({ tools })` prevents the model from falling back
   to turn-by-turn tool calls.
2. **Direct-only tools (Human-in-the-Loop):**
   Tools with irreversible side-effects (initiating payments, deleting databases, deploying code) that require
   interactive confirmation cannot run inside an isolate. Because the isolate evaluates in a single step from the
   model's perspective, an interactive pause cannot be surfaced from inside the sandbox. These tools must remain
   direct tools in `chat({ tools })` and never be bound inside Code Mode.
3. **Dual-role tools:**
   High-level operations that are useful both as standalone actions and as building blocks within a script. Pass
   them to both `createCodeMode({ tools })` and `chat({ tools })`.

---

## Prompt cache stabilization across turns

Provider prompt caches (such as Anthropic or OpenAI prefix caching) rely on stable token prefixes. Mutating tool
definitions dynamically across turns invalidates the cache on every step:

* **Keep `execute_typescript`'s tool schema immutable:** The provider-visible tool definition must remain static.
* **Deliver evolving stubs in messages or fixed blocks:** Pass dynamic declarations, catalogue slices, or
  discovered signatures in conversation messages or a dedicated prompt block rather than rewriting the tool definition.
* **Single declaration prompt:** Follow Rule 2 from the skill: send declarations once in a fenced `typescript` block
  above the prompt.

---

## Bridge governance and host call pacing

Host tool bindings must protect host infrastructure from guest script behaviour:

1. **Pacing inside the isolate budget:**
   `Promise.all` in guest code starts every host call concurrently; Code Mode does not queue them. The default timeout
   is 30 seconds for the entire programme, and the default heap is 128 MB. The Bun driver also throws at 1,000 tool calls
   in one execution. Host bindings must pace upstream calls (e.g. using a concurrency limiter like `p-limit`) to finish
   within the timeout and avoid socket exhaustion.
2. **The chat run's abort signal:**
   Each `external_*` call receives `abortSignal`, `context`, and `emitCustomEvent`. It does not receive `toolCallId`
   or `inputResponse`. The signal is the chat run's. `throwIfAborted()` runs before the call starts, so an already
   aborted run never starts the call. A call that has started keeps running when the guest times out or the context
   is disposed, unless `fetch` was given that signal. A `snippet_*` call does not emit events.
3. **Never nest code execution:**
   Provide typed stubs or structured query tools; avoid tools that take executable script strings as arguments.
   Nested Code Mode causes double JSON escaping, confuses smaller models, and isolates the inner script from outer bindings.
   * **Harness-side vs server-side Code Mode (MCP servers):** Frameworks like FastMCP (Python/Monty) and Cloudflare
     MCP implement Code Mode on the server side, exposing `execute(code: string)`. If a TanStack AI agent connects
     to an MCP server using server-side Code Mode, do not route its `execute` tool through `createCodeMode({ tools })`.
     That forces the model into writing TypeScript whose only purpose is serialising a Python or JavaScript string.
     Instead, expose that server's `execute` tool directly in `chat({ tools })` as a standalone direct tool, or disable
     the server-side transform upstream so TanStack AI can ingest the raw tools and orchestrate them natively in TypeScript.
4. **Direct execution for testing:**
   Isolate drivers can be instantiated and executed directly (`driver.createContext()`, `execute()`) to test and
   benchmark agent scripts deterministically without running an LLM loop.

---

## Architectural rules for TanStack AI Code Mode skills

1. **Keep intermediate data in the sandbox.**
   A model-written programme filters, maps, aggregates and reduces before returning. The model sees `result` and
   `logs`. `console.log` fills `logs` and is also emitted as `code_mode:console`. Log a count.
   Hand a raw value from one `external_*` call to the next inside the same programme. Redact on the host when a
   later turn has to mention a value the model must not read.
2. **Distinguish stubs for the model from types for the compiler.**
   The model needs concise function signatures with only the fields it must supply. The compiler needs complete
   types to catch mistakes during `transpile`. Keeping these separate cuts prompt tokens without sacrificing type safety.
3. **Distinguish discovery tools from in-sandbox catalogues.**
   `discover_tools` returns type stubs to the model's prompt, which costs a conversational round-trip. An in-sandbox
   catalogue tool (such as `external_catalog` or Cloudflare's `search`) returns structured data directly to the
   running programme within the same turn, allowing the programme to inspect endpoints and call them immediately.
4. **Bound execution and concurrency.**
   Isolates must enforce memory caps (typically 128 MB) and strict timeouts (typically 30 seconds). External tool
   bindings must receive and respect `abortSignal` so that an abandoned guest execution cancels upstream HTTP calls.
5. **Pace host calls inside the isolate budget.**
   `Promise.all` starts every host call at once. Code Mode does not queue them. The default timeout is 30 seconds
   for the whole programme, including those calls, and the default heap is 128 MB. The Bun driver also throws at
   1,000 tool calls in one execution. The binding paces to the upstream's own limit and finishes inside that
   timeout. A first call over a small slice belongs in the programme when one full batch can exceed the timeout,
   the heap, or the binding's byte cap.
6. **Never nest code execution.**
   Provide typed stubs or structured query tools; avoid tools whose arguments are executable code strings.
7. **Partition tools by caller.**
   Keep data-query and batch tools inside Code Mode alone. Keep tools requiring human approval in direct chat tools.
