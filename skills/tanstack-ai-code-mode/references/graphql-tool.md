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
5. **Typed answer.** `renderQueryTypes(schema, { fieldNotes })` renders the allowed schema as TypeScript: every object
   type as `type X = { field?: T | null; … }` (optional because a query selects a subset; nullable where GraphQL
   allows), enums as string unions, input types as variable shapes (required fields required), `Query` as
   `type GraphQLAnswer = …`. Each root field carries its note and its GraphQL arguments as a doc comment
   (`/** A resort by its id. Arguments: (id: ID!) */`), so the model writes the query from the types. Custom scalars
   render as `string`.
6. **Hand-declared tool.** Leave `outputSchema` unset, so the generated stub is `Promise<unknown>` and nothing
   re-parses the answer on the way out. A schema there rejects a legal GraphQL payload as
   `Output validation failed for tool graphql`. Replace that stub with
   `declare function external_graphql(input: { query: string; variables?: Record<string, unknown> }): Promise<GraphQLAnswer>;`
   in both declaration copies: `declaration` with every field note for the compiler, `shown` with
   `fieldNotes: false` for the model (root fields keep notes and arguments; object types show bare fields).
7. **Worked queries in the instructions.** Two short examples (several records by id in one call; one record in
   full) as JSON-escaped strings, and the rule that the answer informs the programme's choice but is never itself a
   result. Keep the examples' query strings as named constants shared with any authored snippet that uses them. That
   snippet calls `external_graphql` directly: its isolate has no other `snippet_*` binding.
8. **Budget.** Count each GraphQL call against the run's call budget before sending; refuse past it.

## Rules that made it work

- Read-only is enforced in code (step 3), not asked of the model.
- A refused query is a correctable outcome only when the programme returns it: let the model write one more
  programme. A query that failed upstream is not.
- Keep every ad hoc query with its answer in the run's trace, so a turn can be read and replayed.