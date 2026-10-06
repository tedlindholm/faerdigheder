# Backstage Catalog Descriptor Reference

A focused guide to authoring standard catalog descriptors. Requirements below describe Backstage defaults; an installation can add kinds, validation policies, processors, and taxonomies. Check its configured behaviour before replacing local conventions.

## Kind-specific fields

All entities need `apiVersion`, `kind`, and `metadata.name`. The standard kinds below use `backstage.io/v1alpha1`; Templates use the separate Scaffolder version described afterwards.

| Kind | What it represents | Required `spec` fields | Optional `spec` fields |
| --- | --- | --- | --- |
| `Component` | A deployable or linkable software unit | `type`, `lifecycle`, `owner` | `system`, `subcomponentOf`, `providesApis`, `consumesApis`, `dependsOn`, `dependencyOf` |
| `API` | An interface or contract exposed by software | `type`, `lifecycle`, `owner`, `definition` | `system` |
| `Resource` | Infrastructure needed by software | `type`, `owner` | `system`, `dependsOn`, `dependencyOf` |
| `System` | Cooperating software and resources serving a purpose | `owner` | `domain`, `type` |
| `Domain` | A related area of systems or business capabilities | `owner` | `subdomainOf`, `type` |
| `Group` | An organisational unit or team | `type`, `children` | `profile`, `parent`, `members` |
| `User` | A person | `memberOf` | `profile` |
| `Location` | Pointers to other descriptor files | The `spec` object itself; `{}` is valid | `type`, `target`, `targets`, `presence` |

- `Resource` has no standard lifecycle field. Preserve a local extension if used, but do not require or add it as a default.
- `Group.children` and `User.memberOf` are arrays that must be present and may be empty (`[]`). Group membership lists describe direct membership. A Group has at most one `parent`.
- `Group.profile` and `User.profile` may contain `displayName`, `email`, and `picture`; all are optional strings.
- `owner` is one entity reference, usually to a Group, or explicitly to a User. Choose the entity with ultimate responsibility; this field is not an access-control rule.
- `type` and `lifecycle` are non-empty strings, with taxonomies chosen by the organisation. Common Component types include `service`, `website`, and `library`; common API types include `openapi`, `asyncapi`, `graphql`, and `grpc`. Common Component/API lifecycles are `experimental`, `production`, and `deprecated`. A local value such as `active` is possible, but is not a Backstage-wide standard.
- `Location.type` inherits the reader type from its originating location when omitted. `target` names one file and `targets` lists files; neither field is individually mandatory. Relative paths resolve from the Location descriptor. `presence` is `required` by default or may be `optional`.

### Templates

For new Templates use `apiVersion: scaffolder.backstage.io/v1beta3`. Its schema requires `spec.type` and `spec.steps`; `owner`, `lifecycle`, `parameters`, and `output` are optional. Include a known owner when useful or required locally. Parameters can be a JSON Schema object or an array of form schemas. Each step needs an `action`; verify that its action and inputs are supported by the target Scaffolder.

The catalog descriptor page still contains a legacy `backstage.io/v1beta2` example and inconsistent requirement wording. Use the [current Template guide](https://backstage.io/docs/features/software-templates/writing-templates/) and [v1beta3 schema](https://github.com/backstage/backstage/blob/master/plugins/scaffolder-common/src/Template.v1beta3.schema.json) for new work. Existing legacy Templates need version-specific assessment; do not silently migrate their workflow.

## Metadata

Default metadata rules come from the [descriptor format](https://backstage.io/docs/features/software-catalog/descriptor-format/#common-to-all-kinds-the-metadata). The installation may override field validators.

| Field | Authoring guidance |
| --- | --- |
| `name` | Required, 1–63 characters. Alphanumeric characters with internal `-`, `_`, or `.` are allowed, including uppercase letters. Prefer lowercase kebab-case for new names; preserve existing identities. |
| `namespace` | Optional, defaults to `default`. Use 1–63 lowercase alphanumeric characters with internal hyphens. Namespace and name have different format rules. |
| `title` | Optional short display name. References still use `name`. |
| `description` | Optional short explanation of purpose. Put detailed documentation elsewhere. |
| `labels` | String key/value classifications for querying or filtering. Non-empty values use the name character rules and have a 63-character limit; the default validator also accepts empty values. |
| `annotations` | String key/value metadata for plugins, external identifiers, or other information. Values can contain spaces and have no fixed length limit. Quote numeric and boolean-looking values. |
| `tags` | Strings up to 63 characters: lowercase alphanumeric characters plus `:`, `+`, and `#`, separated by hyphens. Examples: `dotnet`, `c#`, `c++`, `runtime:dotnet`. |
| `links` | Human-facing links. Each needs a URI in `url`; `title`, `icon`, and `type` are optional. An icon is a semantic key whose rendering depends on the app. |

Label and annotation keys have an optional lowercase domain prefix followed by `/`, then a name of up to 63 characters using alphanumeric characters and internal `-`, `_`, or `.`. The domain prefix has a 253-character limit. Use a domain you control for custom keys, such as `example.com/tier`; `backstage.io/` is reserved for Backstage-defined keys.

Labels are suitable for custom classifications when the value fits their format. Annotations suit arbitrary strings or integration settings; custom metadata does not automatically belong in annotations just because it is organisation-specific. Prefer a relevant well-known annotation over a link when a plugin expects that annotation.

The identity is the case-insensitive triplet `(kind, namespace, name)`, not `title`, repository URL, or `uid`. Different kinds or namespaces can share a name. Renaming an entity changes its identity and requires checking incoming references.

Do not copy `metadata.uid`, `metadata.etag`, root `relations`, or root `status` from catalog API responses into source YAML. Processors derive relations and statuses. When consuming catalog API output, use generated relations as the authority for relationships rather than assuming `spec.owner` is the final source.

## Entity references

The string form is `[<kind>:][<namespace>/]<name>`. A full example is `group:default/billing-team`. References transported between systems should include all three parts and use lowercase, ideally through Backstage's `stringifyEntityRef`.

In the built-in catalog processor, omitted namespaces in the fields below resolve to the referencing entity's namespace. A missing entity `metadata.namespace` itself resolves to `default`. These are separate defaults.

| `spec` field | Default target kind | Relationship produced from the entity |
| --- | --- | --- |
| `owner` | `Group` (`User` must be explicit) | `ownedBy` |
| `system` | `System` | `partOf` |
| `domain`, `subdomainOf` | `Domain` | `partOf` |
| `subcomponentOf` | `Component` | `partOf` |
| `providesApis` | `API` | `providesApi` |
| `consumesApis` | `API` | `consumesApi` |
| `dependsOn` | No default kind; specify `component:` or `resource:` | `dependsOn` |
| `dependencyOf` | No default kind; specify `component:` or `resource:` | `dependencyOf` |
| `parent`, `children` | `Group` | `childOf`, `parentOf` |
| `members` | `User` | `hasMember` |
| `memberOf` | `Group` | `memberOf` |

For a Component in namespace `payments`:

- `owner: billing-team` means `group:payments/billing-team`.
- `owner: group:default/billing-team` names a centrally managed Group in `default`.
- `providesApis: [billing-api]` means `api:payments/billing-api`.
- `dependsOn: [resource:billing-db]` means `resource:payments/billing-db`.
- `dependsOn: [billing-db]` lacks a kind and cannot be resolved by the built-in processor.

Shorthand is valid when its defaults identify the intended entity. Full references avoid ambiguity across namespaces. Do not add `spec.partOf` or a root `relations` list to declare relationships; use the field supported by the entity kind. Backstage generates reverse relations, so both ends need not repeat API or dependency declarations.

The [entity reference article](https://backstage.io/docs/features/software-catalog/references/) explains contextual defaults, but its ownership example differs from the current descriptor tables. The [built-in processor](https://github.com/backstage/backstage/blob/master/plugins/catalog-backend/src/processors/BuiltinKindsEntityProcessor.ts) shows the actual default namespace and kind for each field. Custom processors may use different rules.

## API definitions and substitutions

`API.spec.definition` must become a string containing the actual contract in the format named by `spec.type`. A Swagger UI or Scalar link is useful for navigation, but does not supply the required contract.

Inline small contracts using a YAML block scalar, or load a maintained contract with a mapping:

```yaml
apiVersion: backstage.io/v1alpha1
kind: API
metadata:
  name: billing-api
spec:
  type: openapi
  lifecycle: production
  owner: group:default/billing-team
  definition:
    $text: ./openapi/billing.yaml
```

The file must exist at the referenced location. Write `definition` as the mapping above; `definition: $text: ./openapi.yaml` is invalid YAML. `$text` reads a file as a string; `$json` and `$yaml` embed parsed structures, so they do not supply the string expected here. Relative substitutions resolve from the descriptor's folder, not from `backstage.io/source-location`.

For runtime-generated contracts, use a backend-readable specification URL if it is suitable for the installation, or suggest a deliberate export process. Do not invent a placeholder API definition or add CI jobs merely to satisfy a required field. Verify the actual contract, reader authentication, reachability, and update expectations.

For URLs outside configured integrations, Backstage may require an entry in `backend.reading.allow`, optionally restricted to paths. Local `file` locations do not support `$text`, `$json`, or `$yaml` substitutions. Identify required configuration without changing it unless requested.

Check the API's server/base URL inside the contract; viewers can otherwise fall back to the Backstage instance's URL. A descriptor schema check does not validate the OpenAPI, GraphQL, Protobuf, or AsyncAPI contract itself.

See [descriptor substitutions](https://backstage.io/docs/features/software-catalog/descriptor-format/#substitutions-in-the-descriptor-format) and [catalog configuration](https://backstage.io/docs/features/software-catalog/configuration/).

## Integrations and custom metadata

Use annotations for installed plugins and confirmed sources, rather than adding an integration checklist to every entity.

| Annotation | Purpose and value |
| --- | --- |
| `backstage.io/techdocs-ref` | TechDocs source, usually `dir:.` or `dir:./docs`, relative to the descriptor and pointing to the folder containing `mkdocs.yml`. |
| `github.com/project-slug` | GitHub repository slug, `owner/repository`, used by relevant plugins. |
| `backstage.io/source-location` | Source code location, for example `url:https://github.com/example/billing/`; use a location type prefix and end folder URLs with `/`. Useful when the descriptor is stored apart from the source or inference would point to the wrong place. |
| `backstage.io/view-url`, `backstage.io/edit-url` | Overrides for viewing or editing the entity's descriptor source. |

Backstage adds `backstage.io/managed-by-location`, `backstage.io/managed-by-origin-location`, and `backstage.io/orphan` during processing. They describe ingestion state and are not substitutes for a source code location.

Source location is not universally mandatory for Azure DevOps or automatically an author-written field on every GitHub entity. Check the configured integration, source inference, and plugin documentation. For provider-specific keys such as `dev.azure.com/project-repo`, verify the installed plugin's expected value format and supported repository or folder URLs. Do not treat a browser's folder URL as proof that the backend reader supports it.

Metadata is scoped to each entity document. Add needed annotations to each relevant entity; annotations on its System or a neighbouring YAML document are not inherited. A Resource need not point to the repository merely because its descriptor is stored there.

For custom metadata, use keys such as `example.com/cmdb-id: "763"` or `example.com/business-owner: "Jane Doe"`. Attach them to the entity they describe; a CMDB application ID may describe the System, while a deployment classification may describe a Component. Preserve the existing organisation's keys and meaning.

Consult the [well-known annotations](https://backstage.io/docs/features/software-catalog/well-known-annotations/) and the installed plugin's own documentation for additional integrations.

## File placement and discovery

`catalog-info.yaml` is the recommended filename and the repository root is a common location. Neither is a format requirement. Follow existing layout and the actual discovery configuration; repositories can contain multiple files anywhere in the tree.

Common arrangements are a root file containing several YAML documents, one descriptor per software unit, or a `Location` file that points to distributed descriptors:

```yaml
apiVersion: backstage.io/v1alpha1
kind: Location
metadata:
  name: billing-catalog
spec:
  targets:
    - ./services/billing/catalog-info.yaml
    - ./packages/billing-client/catalog-info.yaml
```

These targets must exist. Omitting `spec.type` allows the reader type to be inherited. Use reader-supported target patterns only when the configured reader or discovery provider documents them; a Location is not a universal directory scanner.

Catalog metadata becomes visible through manual URL registration, configured locations, software templates that register their output, or external providers. For manual registration, supply the descriptor URL rather than the repository home page. Confirm the intended route to ingestion; do not infer registration from file placement.

Check `catalog.rules` or location-specific rules for allowed kinds. The documented default allows `Component`, `API`, and `Location`; an explicitly supplied `catalog.rules` list replaces that default. Descriptors of other kinds can be well formed while still being rejected by the installation.

Reuse the organisation's authoritative Group/User and architecture sources. Centralising these entities is a local governance choice, not a Backstage format rule. Avoid introducing duplicate identities through competing files or providers.

See the [Software Catalog overview](https://backstage.io/docs/features/software-catalog/) and [catalog configuration](https://backstage.io/docs/features/software-catalog/configuration/).

## Validation

Distinguish these checks when reporting results:

1. **YAML:** Parse all documents with a YAML parser, including duplicate-key checks where supported. Do not split raw text on `---`, which can occur inside scalar content.
2. **Schema and formats:** Validate the envelope, metadata field formats, and the chosen kind using the target Backstage version and local policies. Built-in kind validators alone do not enforce every field-format or processing rule. An API's `$text` mapping becomes a string during substitution; validate the resolved value as well as the source YAML.
3. **Relationships and contracts:** Check reference resolution, expected target kinds, duplicate `(kind, namespace, name)` identities, and actual API definitions. Referenced entities can come from other locations or providers; local absence does not prove a missing catalog entity.
4. **Ingestion:** Check reader access, substitution support, allowed kinds, configured processors, and discovery. Local validation cannot establish successful ingestion or enabled plugin behaviour.

The bundled `scripts/validate-catalog-info.mjs` covers checks 1 to 3 offline. It parses every document with duplicate-key detection, runs the official `@backstage/catalog-model` envelope, field-format, and kind validators plus the v1beta3 Template validator, resolves `$text`, `$json`, and `$yaml` substitutions against the descriptor folder, resolves every reference field with the built-in processor's defaults, flags `dependsOn` entries without a kind, reports duplicate identities across the given files, checks relative `Location` targets, and rejects catalog output fields. Install its dependencies once with `npm install --prefix <skill-dir>/scripts`; pass `--json` for machine-readable output. Use the repository's own validator or pinned Backstage packages when they exist, since the bundled versions may differ from the installation's. Third-party validators remain supplementary. Check 4 always needs the installation's configuration or an observed ingestion.

The [catalog schemas](https://github.com/backstage/backstage/tree/master/packages/catalog-model/src/schema) and [field validators](https://github.com/backstage/backstage/blob/master/packages/catalog-model/src/validation/makeValidator.ts) can resolve discrepancies in prose documentation. Prefer the target release's source for version-specific work.

## Examples

These examples illustrate descriptor structure. Replace example names and verify referenced owners, contracts, configuration, and target files before using them in a catalog.

### Minimal library

```yaml
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: billing-client
  description: Client library for the Billing API.
spec:
  type: library
  lifecycle: production
  owner: group:default/billing-team
```

### Related entities in one file

The Group is included to show its required empty children list; reuse an existing Group if the organisation already manages it. The Domain, System, service, API, and database have separate identities. Relationships are expressed through `spec` fields.

```yaml
apiVersion: backstage.io/v1alpha1
kind: Group
metadata:
  name: billing-team
spec:
  type: team
  children: []
---
apiVersion: backstage.io/v1alpha1
kind: Domain
metadata:
  name: finance
spec:
  owner: group:default/billing-team
---
apiVersion: backstage.io/v1alpha1
kind: System
metadata:
  name: billing
spec:
  owner: group:default/billing-team
  domain: domain:default/finance
---
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: billing-service
spec:
  type: service
  lifecycle: production
  owner: group:default/billing-team
  system: system:default/billing
  providesApis:
    - api:default/billing-api
  dependsOn:
    - resource:default/billing-db
---
apiVersion: backstage.io/v1alpha1
kind: API
metadata:
  name: billing-api
spec:
  type: openapi
  lifecycle: production
  owner: group:default/billing-team
  system: system:default/billing
  definition: |
    openapi: 3.0.3
    info:
      title: Example Billing API
      version: 1.0.0
    servers:
      - url: https://billing.example.com
    paths:
      /invoices:
        get:
          responses:
            '200':
              description: Invoices retrieved.
---
apiVersion: backstage.io/v1alpha1
kind: Resource
metadata:
  name: billing-db
spec:
  type: database
  owner: group:default/billing-team
  system: system:default/billing
```

### User with no direct memberships

```yaml
apiVersion: backstage.io/v1alpha1
kind: User
metadata:
  name: jane.doe
spec:
  profile:
    displayName: Jane Doe
  memberOf: []
```

### Template metadata and one step

This demonstrates the modern envelope and a log step; it does not create a software project. Verify action availability in the target Scaffolder.

```yaml
apiVersion: scaffolder.backstage.io/v1beta3
kind: Template
metadata:
  name: catalog-demo
spec:
  type: service
  owner: group:default/billing-team
  steps:
    - id: log
      name: Log a message
      action: debug:log
      input:
        message: Catalog descriptor demonstration.
```

## Mapping an existing registry

Use the source record's meaning to choose the kind; a CMDB's word for an application or service does not determine its Backstage kind.

| Source concept | Possible mapping |
| --- | --- |
| Business capability or related area | `Domain` |
| Product or cooperating application bundle | `System` |
| Deployable service, website, or reusable library | `Component` |
| Interface or contract | `API` |
| Database, bucket, or queue | `Resource` |
| Responsible team or organisational unit | `Group` |
| Individual person | `User`, or descriptive metadata when not the accountable owner |

Preserve legacy IDs with existing custom metadata conventions. Distinguish business ownership from the single accountable `spec.owner`; do not automatically replace one with a maintenance contact. Map lifecycle values deliberately to the installation's taxonomy rather than imposing a fixed set of states. Keep migration mappings explicit when one source record becomes several entities.
