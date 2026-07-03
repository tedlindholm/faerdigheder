# Backstage Catalog Descriptor Reference

This reference details the official schema format, metadata constraints, entity reference syntax, kind specifications, well-known annotations, and relationship definitions for Spotify's Backstage Software Catalog (`catalog-info.yaml`).

---

## 1. Common Envelope & Metadata Schema

Every catalog descriptor file is a YAML document. Multiple entities can be defined in a single file by separating them with `---`. Every entity must follow this envelope structure:

```yaml
apiVersion: backstage.io/v1alpha1
kind: <Kind> # e.g., Component, API, Resource, System, Domain, User, Group, Template
metadata:
  name: <string> # Required: Max 63 chars, DNS-subdomain format
  namespace: <string> # Optional: Max 63 chars, defaults to 'default'
  title: <string> # Optional: Human-readable display name
  description: <string> # Optional: Summary of functionality
  labels: # Optional: Key-value classification pairs
    backstage.io/tier: tier-1
  annotations: # Optional: Plugin integration key-value pairs
    backstage.io/techdocs-ref: dir:.
  tags: # Optional: Array of lowercase strings
    - java
    - spring-boot
  links: # Optional: Array of external hyperlinks
    - url: https://dashboard.example.com
      title: Grafana Dashboard
      icon: dashboard
      type: admin-dashboard
spec:
  # Kind-specific specification block
```

### Naming & Metadata Constraints
- **`name`** and **`namespace`**: Subject to Kubernetes DNS label rules. Must be between 1 and 63 characters, contain only lowercase alphanumeric characters (`a-z`, `0-9`) or hyphens (`-`), and start/end with an alphanumeric character (`^[a-z0-9]+(-[a-z0-9]+)*$`).
- **`tags`**: Must be strings of lowercase alphanumeric characters, hyphens, or colons (`^[a-z0-9:-]+$`).
- **`labels` vs `annotations`**: **Label values** have strict Kubernetes character rules: max 63 characters, matching `^[a-zA-Z0-9]([a-zA-Z0-9._-]*[a-zA-Z0-9])?$`. Do not store arbitrary strings (like names with spaces or special characters) in labels, or validation will fail. Use labels exclusively for filterable, machine-friendly classifications. For arbitrary or human-readable data (e.g., service IDs, responsible person, availability tier), use **annotations** which accept freeform strings.
- **`apiVersion`**: All entity kinds (`Component`, `API`, `Resource`, `System`, `Domain`, `User`, `Group`, `Location`) use `backstage.io/v1alpha1`. **Exception:** `Template` entities use `backstage.io/v1beta2` (or `scaffolder.backstage.io/v1beta3`). Using `v1alpha1` on a Template will fail validation.
- **Runtime System Fields**: Fields like `uid` (unique identifier) and `etag` (optimistic concurrency hash) are managed automatically by Backstage processors at runtime. **Never hardcode `uid` or `etag` in source YAML files.**

---

## 2. Entity References syntax

Many fields in `spec` (such as `owner`, `system`, `domain`, `providesApis`, `consumesApis`, `dependsOn`, `partOf`, `memberOf`, `parent`, `children`, `members`) accept **Entity References**.

### Syntax
The standard string format for an entity reference is:
```
[<kind>:][<namespace>/]<name>
```

### Evaluation Rules
- **Explicit format (recommended)**: `group:default/billing-team` or `system:default/billing-system`.
- **Default namespace**: If `<namespace>/` is omitted, it defaults to `default` (or the namespace of the referencing entity). Example: `group:billing-team` evaluates to `group:default/billing-team`.
- **Default kind**: If `<kind>:` is omitted, Backstage infers the kind based on the field's expected type (e.g., in `providesApis`, `billing-api` infers `api:default/billing-api`).

---

## 3. Entity Kinds & Specifications

### Component
Represents a standalone software unit (microservice, website, library, data pipeline).

**Spec Fields:**
- `type` (**required**): Classification string. Common values: `service`, `website`, `library`, `common`, `data-pipeline`.
- `lifecycle` (**required**): Maturity state. Common values: `experimental`, `active`, `production`, `deprecated`.
- `owner` (**required**): Entity reference to a `Group` or `User`.
- `system` (*optional*): Entity reference to the parent `System`.
- `subcomponentOf` (*optional*): Entity reference to a parent `Component`.
- `providesApis` (*optional*): Array of provided `API` entity references.
- `consumesApis` (*optional*): Array of consumed `API` entity references.
- `dependsOn` (*optional*): Array of component/resource entity references this component relies on.

---

### API
Represents an interface or API contract provided by a component.

**Spec Fields:**
- `type` (**required**): Format classification. Common values: `openapi`, `grpc`, `graphql`, `asyncapi`.
- `lifecycle` (**required**): Maturity state (`experimental`, `active`, `production`, `deprecated`).
- `owner` (**required**): Entity reference to owning `Group` or `User`.
- `system` (*optional*): Entity reference to parent `System`.
- `definition` (**required**): Raw text specification of the API (e.g., OpenAPI YAML string). In Backstage, this can also use the `$text:` file reader directive (e.g., `$text: ./openapi.yaml`). Note: `definition` cannot be empty or omitted; pointing to a live Swagger UI via `metadata.links` is **not** sufficient.

#### When there's no committed spec file (Runtime-Generated Specs)
Very often, web services (e.g., Spring Boot, FastAPI, ASP.NET, Express) serve their OpenAPI/Swagger spec dynamically at runtime without committing a static file to git. When authoring `kind: API`, fill `definition` using one of these approaches (in order of preference):
1. **Export & commit the spec in CI**: Have your CI pipeline fetch the runtime spec (e.g., via `curl`) and commit/bundle it as a static file, then reference it: `definition: $text: ./openapi.yaml`. Best option—versioned, diffable, and works offline.
2. **Reference a readable URL**: Point directly to an accessible HTTP spec: `definition: $text: https://host/openapi.json`. Note: Requires the URL to be reachable by the Backstage backend process (not ideal for internal-only endpoints without ingress).
3. **Inline a placeholder**: Inline a minimal, valid schema covering core endpoints, clearly commented as a placeholder. Least preferred—drifts from live reality.

---

### Resource
Represents physical or virtual infrastructure needed by components (databases, S3 buckets, Kubernetes clusters, messaging topics).

**Spec Fields:**
- `type` (**required**): Classification string (e.g., `database`, `s3-bucket`, `kubernetes-cluster`).
- `lifecycle` (**required**): Maturity state.
- `owner` (**required**): Entity reference to owning team/user.
- `system` (*optional*): Entity reference to parent `System`.
- `dependsOn` / `dependencyOf` (*optional*): Arrays of entity references showing resource interdependencies.

---

### System
A collection of components, APIs, and resources collaborating to perform a broader business function.

**Spec Fields:**
- `owner` (**required**): Entity reference to owning team/user.
- `domain` (*optional*): Entity reference to parent `Domain`.

---

### Domain
A high-level organizational boundary grouping related systems (e.g., aligning with department or business unit capabilities).

**Spec Fields:**
- `owner` (**required**): Entity reference to owning team/user.

---

### User
Represents an individual human in the catalog.

**Spec Fields:**
- `profile` (*optional*): Object containing `displayName`, `email`, and `picture` URL.
- `memberOf` (**required**): Array of `Group` entity references this user belongs to.

---

### Group
Represents an organizational unit, team, or department.

**Spec Fields:**
- `type` (**required**): Classification string (e.g., `team`, `business-unit`, `department`).
- `profile` (*optional*): Object containing `displayName`, `email`, and `picture` URL.
- `parent` (*optional*): Entity reference to parent `Group`.
- `children` (*optional*): Array of child `Group` references.
- `members` (*optional*): Array of `User` references belonging directly to this group.

---

### Template
Represents a Software Scaffolder template used by developers to generate new repositories or components.

**Spec Fields:**
- `apiVersion` (**required**): Must be `backstage.io/v1beta2` or `scaffolder.backstage.io/v1beta3` (do NOT use `v1alpha1`).
- `type` (**required**): What this template creates (e.g., `service`, `website`).
- `lifecycle` (**required**) & `owner` (**required**).
- `parameters`: Array of JSON Schema objects defining user input forms.
- `steps`: Array of scaffolder execution steps (e.g., `fetch:template`, `publish:github`, `catalog:register`).
- `output`: Object describing template outputs (e.g., links to created repo or catalog entity).

---

### Location
Used to point Backstage processors to external catalogs or directories.

**Spec Fields:**
- `type` (**required**): Reader type (e.g., `url`, `file`).
- `target` (**required**): Path or URL to target descriptor or directory.
- `targets` (*optional*): Array of target paths/URLs.

---

## 4. Well-Known Annotations & Relations

### Well-Known Annotations (`metadata.annotations`)
- `backstage.io/techdocs-ref`: Points to TechDocs documentation source (e.g., `dir:.` or `dir:./docs`).
- `backstage.io/source-location`: Explicit repository source URL. **Requires a type prefix** (e.g., `url:https://github.com/org/repo/`). If pointing to a subdirectory, **must end with a trailing slash** (`url:https://github.com/org/repo/tree/main/subdir/`).
- `backstage.io/view-url` / `backstage.io/edit-url`: Custom UI links for viewing or editing source.
- `github.com/project-slug`: GitHub integration (`owner/repo`).
- `gitlab.com/project-slug`: GitLab integration (`group/subgroup/repo`).
- `dev.azure.com/project-repo`: Azure DevOps integration (`<project>/<repo>`).
- `sentry.io/project-slug`: Sentry error tracking dashboard integration.
- `pagerduty.com/integration-key`: PagerDuty service key for on-call status.
- `circleci.com/project-slug` / `jenkins.io/job-full-name`: CI/CD pipeline tracking.

#### Source Location & Monorepo Rules
When configuring source locations, distinguish between author-written and auto-managed annotations:

| Annotation | Points to | Set by |
|---|---|---|
| `backstage.io/source-location` | The actual **source code** location | **Manually by author** (used when catalog file is stored apart from code) |
| `backstage.io/managed-by-location` | Where the `catalog-info.yaml` **itself** was fetched from | **Automatically by Backstage** on ingestion (do NOT hand-write) |
| `backstage.io/managed-by-origin-location` | The original registered ingestion location | **Automatically by Backstage** (do NOT hand-write) |

- **Monorepos & Azure DevOps limitation**: For GitHub, pointing a component to a monorepo subdirectory works via folder URLs (`url:https://github.com/org/repo/tree/main/subdir/`). However, **Azure DevOps has no clean folder-tree URL** (its web UI uses `?path=/subdir` query strings, which are malformed for source-locations). For Azure DevOps monorepos, point `source-location` to the repository root instead.

#### Custom Organizational Metadata
When storing organization-specific or custom metadata that has no well-known Backstage key (e.g., service ID, availability classification, team contact), use **annotations** with a domain prefix you own (`<domain>/<key>`):
```yaml
metadata:
  annotations:
    acme.com/technical-service-id: "6081"
    acme.com/availability-classification: "3 - Important"
    acme.com/team-responsible: "Jane Doe"
```
Do not use reserved prefixes (`backstage.io/`, `kubernetes.io/`) for custom keys.

### Well-Known Relations
Relations are built implicitly via spec fields or explicitly via catalog processors:
- `ownedBy` / `ownerOf` (`spec.owner`)
- `partOf` / `hasPart` (`spec.system`, `spec.domain`, `spec.subcomponentOf`)
- `providesApi` / `apiProvidedBy` (`spec.providesApis`)
- `consumesApi` / `apiConsumedBy` (`spec.consumesApis`)
- `dependsOn` / `dependencyOf` (`spec.dependsOn`)
- `memberOf` / `hasMember` (`spec.memberOf`, `spec.members`)
- `childOf` / `parentOf` (`spec.parent`, `spec.children`)

---

## 5. Complete Copy-Pasteable Examples

### Multi-Entity Microservice Architecture
The following production-ready example demonstrates a Domain, System, Component, API, and Resource defined together:

```yaml
apiVersion: backstage.io/v1alpha1
kind: Domain
metadata:
  name: e-commerce
  description: Core e-commerce capabilities including catalog, checkout, and order fulfillment.
spec:
  owner: group:retail-execs
---
apiVersion: backstage.io/v1alpha1
kind: System
metadata:
  name: checkout-system
  description: Services and infrastructure supporting customer checkout and payment processing.
spec:
  owner: group:checkout-team
  domain: domain:default/e-commerce
---
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: checkout-service
  title: Checkout Processing Service
  description: Handles cart validation, order placement, and payment orchestration.
  tags:
    - typescript
    - nodejs
    - aws
  annotations:
    backstage.io/techdocs-ref: dir:.
    github.com/project-slug: retail-org/checkout-service
    pagerduty.com/integration-key: PD12345678
  links:
    - url: https://grafana.internal.net/d/checkout-service
      title: Production Grafana Dashboard
      icon: dashboard
spec:
  type: service
  lifecycle: production
  owner: group:default/checkout-team
  system: system:default/checkout-system
  providesApis:
    - api:default/checkout-api
  consumesApis:
    - api:default/payment-gateway-api
  dependsOn:
    - resource:default/checkout-db
---
apiVersion: backstage.io/v1alpha1
kind: API
metadata:
  name: checkout-api
  description: OpenAPI contract for placing orders and querying cart status.
spec:
  type: openapi
  lifecycle: production
  owner: group:default/checkout-team
  system: system:default/checkout-system
  definition: |
    openapi: 3.0.0
    info:
      title: Checkout API
      version: 1.0.0
    paths:
      /orders:
        post:
          summary: Create a new order
          responses:
            '201':
              description: Order created successfully
---
apiVersion: backstage.io/v1alpha1
kind: Resource
metadata:
  name: checkout-db
  description: PostgreSQL database storing orders, transaction states, and cart items.
  tags:
    - postgres
    - rds
spec:
  type: database
  lifecycle: production
  owner: group:default/checkout-team
  system: system:default/checkout-system
```

---

## 6. CLI & Automated Validation

To validate descriptor files locally or in CI/CD pipelines before ingestion, the standard community tool is `@roadiehq/backstage-entity-validator`. It executes the exact same schema and type checks as the Backstage catalog engine.

```bash
# Validate a single descriptor
npx @roadiehq/backstage-entity-validator --path catalog-info.yaml

# Validate all descriptors across a monorepo
npx @roadiehq/backstage-entity-validator --path "services/*/catalog-info.yaml"
```

---

## 7. File Placement, Discovery & Scanner Conventions

When setting up catalog discovery or writing custom repo scanners, follow these placement and naming conventions:

### File Placement & Naming Rules
1. **Default Location**: Place a descriptor file named `catalog-info.yaml` at the root of the repository. Auto-discovery processors and the Backstage "register existing component" flow expect this exact name at the default branch root.
2. **Monorepos**: Two common, accepted patterns:
   - **Multi-document root**: A single root `catalog-info.yaml` with multiple entities separated by `---` (best for tightly-coupled packages).
   - **Distributed files**: One `catalog-info.yaml` per package/component subfolder (e.g., `packages/app/catalog-info.yaml`), discovered via glob pattern or tied together by a root `kind: Location` entity using `spec.targets`.
3. **Org Entities (`Group` / `User`) & Central Architecture (`Domain` / `System`)**: Do not scatter org entities or top-level Systems/Domains across individual service repositories. Centralize them in a dedicated org/architecture repository or a root `catalog/` directory, registered once. (Note: Groups and Users are typically ingested from an identity provider like Entra ID, Okta, or GitHub Teams rather than hand-written).
4. **`Location` Kind as Glue**: Use a root `Location` descriptor with `spec.targets` to reference files or URLs that reside outside standard discovery paths.
5. **Documentation Site Gotcha**: Do not drop machine catalog YAML files into documentation site content folders (e.g., Astro Starlight `src/content/docs`), as this can break static doc builds or cause the catalog file to be ignored. Keep catalog metadata separate from rendered doc pages.

### Repo Scanner Contract
If building an automated tool or scanner to locate and identify descriptor files across many repositories without running a Backstage backend:
- **Filename Matching**: Search for files named exactly `catalog-info.yaml` (root first, then `**/catalog-info.yaml` for monorepos). Exclude build artifacts and dependencies (`node_modules`, `dist`, `.git`, `bin`, `obj`).
- **Robust Content Signature**: Verify that the YAML document has an `apiVersion` starting with `backstage.io/` or `scaffolder.backstage.io/` **and** a valid `kind` (`Component`, `API`, `Resource`, `System`, `Domain`, `Group`, `User`, `Template`, `Location`). This filters out stray YAML files (like docker-compose or CI workflows) and correctly identifies valid descriptors even if renamed.
- **Multi-Document Handling**: Always split files on `---` to inspect each YAML document independently.

---

## 8. Mapping an Existing CMDB or Service Registry

When bootstrapping Backstage from an existing CMDB, APM, or internal service registry (e.g., ServiceNow APM or custom technical service registries), use this translation table to map legacy records to Backstage kinds:

| CMDB / APM Concept | Backstage Kind | Notes & Mapping Rules |
|---|---|---|
| Business Unit | `Domain` | Top-level organizational grouping. |
| Capability / System Grouping | `Domain` or `System` | Choose based on architecture granularity. |
| Technical Service / Application | `System` | Represents the overall product or service bundle; often carries the CMDB ID. |
| Deployable Unit / Repository | `Component` | Set `spec.type` appropriately (`service`, `website`, `library`). |
| Exposed Interface / Contract | `API` | Linked via `providesApis` and `consumesApis`. |
| Database, Bucket, Queue | `Resource` | Linked via `dependsOn`. |
| Team / Squad | `Group` | Primary target for `spec.owner`. |
| Responsible Person | `User` or annotation | Prefer setting `spec.owner` to a `Group`; record individuals via metadata annotations. |

### Migration Gotchas
- **Single-Valued `spec.owner`**: Backstage requires `spec.owner` to be a single entity reference (preferably a `Group`). If your CMDB records both an "Owned by" department and a "Maintenance team", assign the active maintenance team as `spec.owner` and record the organizational owner via a custom metadata annotation or on the parent `System` entity.
- **Preserve CMDB Identifiers**: Record legacy IDs (e.g., service IDs, availability tiers, cost centers) as custom organizational annotations (e.g., `acme.com/cmdb-service-id: "6081"`). Remember that Kubernetes label character rules forbid spaces and special characters, so use annotations for arbitrary strings.
- **Lifecycle Mapping**: Translate CMDB status strings to standard Backstage lifecycle states (e.g., map `"In Production"` or `"Live"` to `production`; `"In Development"` to `experimental` or `active`).
