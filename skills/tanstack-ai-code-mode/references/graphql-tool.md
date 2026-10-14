# A GraphQL API as a Code Mode tool

Let the programme write ad hoc GraphQL instead of one tool per query, while code decides what may be sent and types
what comes back. Built with `graphql` (the reference implementation) and TypeScript's compiler API.

## Pieces

1. **Schema snapshot.** Print the API's SDL from its source or introspection into the repository
   (`origin/schema.graphql`) with a script, and record the commit it came from. The snapshot is the contract; the
   tool never introspects at run time.
2. **Allowlist.** A typed object `{ [TypeName]: { [field]: note } }` plus root fields `{ [field]: { note, caps } }`.
   `buildAllowedSchema(allowlist, roots)` cuts the snapshot down to it with `buildSchema` and fails loudly at build
   time on a field the snapshot lacks or an object type the allowlist does not list (a stale allowlist must never be
   found at a customer's turn). Scalars, enums and input types referenced are copied whole with `printType`.
3. **Query check.** `checkQuery(query, variables)` parses with `parse`, then refuses before anything is sent:
   anything but exactly one `query` operation (no `mutation`, `subscription`, or second operation); introspection
   fields; selection depth, alias count and field count over fixed caps; list arguments over their cap, including
   inside fragments. Then `validate` against the allowed schema, so a field outside the allowlist is refused with the
   schema's reason. Prefix refusals with one fixed string and return that value: the isolate delivers a thrown
   tool error to the programme as `new Error(message)` and drops the name and stack, so the prefix is the only
   signal. The programme returns the refusal, `execute_typescript` succeeds, and one more programme is allowed for
   that prefix. An upstream failure still throws, and that run stops.
4. **Paced client.** One request at a time, a floor between requests, a byte cap on the answer, and the tool's
   `abortSignal` passed to `fetch`. A guest timeout settles the programme and leaves the HTTP call running unless
   `fetch` got that signal. The byte cap stays well under the isolate's 128 MB, and the pace finishes inside the
   isolate timeout. The API credential stays in this client: a tool parameter whose name looks like a secret is
   warned on when the tool is created, and can be set to throw.
5. **Typed answer.** `renderQueryTypes(schema, { fieldNotes })` renders the allowed schema as TypeScript for the
   compiler's copy: every object type as `type X = { field?: T | null; … }` (optional because a query selects a
   subset; nullable where GraphQL allows), enums as string unions, input types as variable shapes (required fields
   required), `Query` as `type GraphQLAnswer = …`. Each root field carries its note and its GraphQL arguments as a
   doc comment (`/** A resort by its id. Arguments: (id: ID!) */`). Custom scalars render as `string`. This render
   type-checks a programme that names those fields in TypeScript. A query string is opaque to the compiler;
   `checkQuery` is what reads inside it.
6. **Hand-declared tools.** Leave `outputSchema` unset, so the generated stub is `Promise<unknown>` and nothing
   re-parses the answer on the way out. A schema there rejects a legal GraphQL payload as
   `Output validation failed for tool graphql`. The model's copy is the two signatures and no schema:

   ```typescript
   declare function external_catalog(input: {
     root?: string
     typeName?: string
   }): Promise<Catalog>
   declare function external_graphql(input: {
     query: string
     variables?: Record<string, unknown>
   }): Promise<GraphQLAnswer>
   ```

   `Catalog` is `{ roots: Array<{ field: string; args: string; note: string }>; types: Array<{ name: string; fields:
   Array<{ name: string; type: string }> }> }`. No selector returns the root list only. `root` adds that field's
   note and the type names it reaches. `typeName` adds that type's fields. The compiler's copy replaces
   `GraphQLAnswer` with the render from step 5.
7. **Worked queries in the instructions.** Two short examples (several records by id in one call; one record in
   full) as JSON-escaped strings, and the rule that the answer informs the programme's choice but is never itself a
   result. Keep the examples' query strings as named constants shared with any authored snippet that uses them. That
   snippet calls `external_graphql` directly: its isolate has no other `snippet_*` binding.
8. **Budget.** Count each GraphQL call against the run's call budget before sending; refuse past it.

## The catalogue stays in the sandbox

Cloudflare keeps a 2,500-endpoint API behind `search` and `execute`, about 1,000 tokens of tool definitions, by
leaving the OpenAPI spec in the isolate. TanStack's tool result is `{ success, result, logs }`, so the same cut is
one `execute_typescript` and the two signatures above, with the allowlist kept out of `result` and `logs`.

The programme calls `external_catalog`, builds `query` from that value, and calls `external_graphql`. The allowlist
crosses into the sandbox and stops there. Returning the catalogue is how it enters the conversation: do that only
when the next programme must write those names into its source, and then allow one more `execute_typescript`. A
programme that called `external_graphql` ends the run.

`discover_tools` is the wrong tool for this. It sends type stubs back to the model. `external_catalog` sends the
slice to the programme.

## Rules that made it work

- Read-only is enforced in code (step 3), not asked of the model.
- A refused query is a correctable outcome only when the programme returns it: let the model write one more
  programme. A query that failed upstream is not.
- Keep every ad hoc query with its answer in the run's trace, so a turn can be read and replayed. The model sees
  `result` and `logs`. `console.log` of the answer puts it in both. Return ids.