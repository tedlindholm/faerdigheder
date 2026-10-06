---
name: backstage-catalog-info
description: Create, update, review, or validate Backstage catalog-info.yaml descriptors (Component, API, Resource, System, Domain, Group, User, Location, Template), including ownership, entity references, API definitions, annotations, and multi-entity files. Use when asked to catalogue a repository or service, fix a descriptor that Backstage rejects, map a CMDB or service registry into catalog entities, or check how descriptors are discovered and registered.
---

# Backstage Catalog Info

Describe the actual software and its accountable owner in catalog YAML, then prove the file is well formed. Writing the file does not register it: Backstage ingests descriptors from registered locations, discovery, or entity providers, and local validation cannot confirm that step.

## Workflow

1. **Read the installation before writing.** Look for existing descriptors, `app-config*.yaml` (`catalog.locations`, `catalog.rules`, `catalog.providers`, `integrations`), repository instructions, and any existing validation command. Reuse the taxonomy, owners, namespaces, and annotation keys already in use.
2. **Decide which entities exist** using the table below. Model software units, not repositories: one repository may hold several Components, and a Component without a System is complete.
3. **Resolve the facts that affect correctness:** owner, API contract, dependencies. Search the repository and catalog first; ask only when evidence runs out. Never invent a Group, API, or contract to make a file look complete.
4. **Write the descriptor** following [Author the descriptor](#author-the-descriptor). Preserve the repository's layout and any existing identities.
5. **Validate** with the bundled script, then fix every error and read every warning.
6. **Report** what changed, what was checked, and what remains unverified.

### Phase 2 — Populate Envelope & Metadata
2. Define the top-level envelope (`apiVersion`, `kind`, and `metadata`):
   - `apiVersion`: Use `backstage.io/v1alpha1` for all kinds **except** `Template`. For `Template` entities, use `backstage.io/v1beta2` or `scaffolder.backstage.io/v1beta3`. Using `v1alpha1` on a Template will fail validation.
   - `name` (**required**): 1–63 characters, alphanumeric (`a-z`, `A-Z`, `0-9`) sequences possibly separated by `-`, `_` or `.` (`^[a-zA-Z0-9]+([-_.][a-zA-Z0-9]+)*$`). Uppercase, underscores and dots are legal (e.g., `CircleciBuildsDumpV2_avro_gcs`); lowercase-and-hyphens is only a house preference, so do not rename a valid name to satisfy it.
   - `namespace` (*optional*): Defaults to `"default"` if omitted. Stricter than `name`: max 63 characters, alphanumeric sequences possibly separated by `-` only (no underscores or dots).
   - `title` (*optional*): Human-readable display name (e.g., `"Billing Processing Service"`).
   - `description` (*optional but recommended*): Clear summary of the entity's functionality.
   - `tags` (*optional*): Array of lowercase string tags for filtering (e.g., `["java", "spring-boot", "aws"]`).
   - `labels` (*optional*): Key-value pairs for Kubernetes-style classification and filtering. Max 63 chars per value, alphanumeric/hyphens/dots/underscores without spaces. Use `annotations` for freeform or custom org strings.
   - `links` (*optional*): Array of external URLs (each containing `url`, and optionally `title`, `icon`, `type`).
   - **Do NOT include runtime system fields**: Never hardcode `uid`, `etag`, or `status` in source YAML files.

### Phase 3 — Specify Kind-Specific `spec` & Relations
3. Populate the `spec` block according to the entity kind:
   - Always specify `owner` (entity ref to a `Group` or `User`, e.g., `group:billing-team` or `user:janedoe`) for `Component`, `API`, `Resource`, `System`, `Domain`, and `Template`.
   - For `Component`, `API`, and `Resource`: Include `lifecycle` (`experimental`, `active`, `production`, `deprecated`) and optional `system` reference.
   - For `Component`: Set `type` (`service`, `website`, `library`, etc.), and map dependencies using `providesApis`, `consumesApis`, `dependsOn`, and `subcomponentOf`.
   - For `API`: Set `type` (`openapi`, `grpc`, `graphql`, `asyncapi`) and provide the `definition` string (inline, `$text: ./openapi.yaml`, or `$text: https://...`). For runtime-generated specs (Swagger), export/commit in CI or reference a readable URL; pointing via `metadata.links` alone is invalid.
   - For `System` / `Domain`: Set `domain` (on System) to build the organizational hierarchy; nest domains with `subdomainOf` (on Domain).

| What is being catalogued | Kind | Required `spec` |
| --- | --- | --- |
| Service, website, library, pipeline, tool | `Component` | `type`, `lifecycle`, `owner` |
| Interface with a contract (OpenAPI, AsyncAPI, GraphQL, gRPC) | `API` | `type`, `lifecycle`, `owner`, `definition` |
| Database, queue, bucket, cluster | `Resource` | `type`, `owner` |
| Cooperating Components, APIs and Resources shipping as one product | `System` | `owner` |
| Business area grouping Systems | `Domain` | `owner` |
| Team or organisational unit | `Group` | `type`, `children` |
| Person | `User` | `memberOf` |
| Pointer to other descriptor files | `Location` | `targets` or `target` |
| Scaffolder template | `Template` (`scaffolder.backstage.io/v1beta3`) | `type`, `steps` |

For CMDB or registry migrations, pick kinds by meaning with [Mapping an existing registry](references/backstage-descriptor-reference.md#mapping-an-existing-registry).

## Author the descriptor

- `apiVersion: backstage.io/v1alpha1` for all standard kinds; Templates use the Scaffolder version above. Keep custom kinds and versions the installation already supports.
- `metadata.name` is the identity together with kind and namespace. Prefer lowercase kebab-case for new names; never rename an existing entity casually, because references break. Add a one-sentence `description`.
- `type` and `lifecycle` are organisation-defined strings. Reuse the values already in the catalog rather than a fixed enum.
- `spec.owner` is one Group (or explicitly `user:`) reference to the accountable party. It is not an access rule. Prefer centrally managed Groups and Users; do not redeclare them in every repository.
- Write relationships through `spec` fields only. Shorthand picks up defaults from the referencing entity, so write full references wherever ambiguity is possible:

  | Field | Default kind | Default namespace |
  | --- | --- | --- |
  | `owner` | `group` | the entity's own namespace |
  | `system`, `domain`, `subdomainOf`, `subcomponentOf`, `providesApis`, `consumesApis`, `parent`, `children`, `members`, `memberOf` | the field's natural kind | the entity's own namespace |
  | `dependsOn`, `dependencyOf` | none, write `component:` or `resource:` | the entity's own namespace |

  Backstage generates reverse relations, so declare each relationship once.
- `API.spec.definition` must become the contract text. Inline it with a block scalar or load a file with the mapping form:

  ```yaml
  definition:
    $text: ./openapi/billing.yaml
  ```

  The path resolves from the descriptor's folder and the file must exist. A documentation link is not a definition. For runtime-generated specs, see [API definitions](references/backstage-descriptor-reference.md#api-definitions-and-substitutions).
- Annotations are for configured integrations and string metadata; labels and tags for classification; links for people. Add well-known annotations only when the plugin is installed. Use a domain you control for custom keys, such as `example.com/cmdb-id`, and quote values that look numeric or boolean.
- Keep catalog output out of source YAML: `metadata.uid`, `metadata.etag`, root `relations`, root `status`, and `backstage.io/managed-by-*` or `backstage.io/orphan` annotations.
- Several entities in one file are separated by `---`. Each document carries its own metadata; annotations are not inherited from the System or a neighbouring document.

Consult the [descriptor reference](references/backstage-descriptor-reference.md) for metadata formats, kind details, well-known annotations, file placement, and worked examples.

## Validate

Run the bundled validator. It uses the official `@backstage/catalog-model` validators and resolves substitutions, references, Location targets, and duplicate identities across the files you pass:

```sh
npm install --prefix <skill-dir>/scripts   # once
node <skill-dir>/scripts/validate-catalog-info.mjs catalog-info.yaml [more files or directories] [--json]
```

- Pass every descriptor that belongs together so cross-file references resolve. An `INFO` line about an undeclared reference means the target lives elsewhere; confirm it exists in the catalog, or declare it where the installation keeps that kind.
- Exit code 1 means a schema, format, substitution, reference, or duplicate error. Fix and re-run until clean.
- If the repository has its own validator or pinned Backstage packages, run those too. Their result wins when the versions differ.
- The script cannot check ingestion. Separately confirm the route into the catalog (registered URL, configured location, discovery provider, or entity provider), that `catalog.rules` allows the kinds used, and that the reader can reach any URL in `$text` or `Location` targets. Do not change catalog configuration or register entities unless that is in scope.

## Report

State, in this order: files written or changed; entities declared as `kind:namespace/name`; checks run and their result; assumptions made; and open questions on ownership, contracts, discovery, or allowed kinds. Say "valid locally" rather than "registered" unless ingestion was observed.

## Official sources

[Software Catalog overview](https://backstage.io/docs/features/software-catalog/) for ingestion concepts, [descriptor format](https://backstage.io/docs/features/software-catalog/descriptor-format/) for fields, and [well-known annotations](https://backstage.io/docs/features/software-catalog/well-known-annotations/) for integrations. When prose and examples disagree, the target version's schemas and processor in the Backstage repository decide; the reference links to them.
