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
- `definition` (**required**): Raw text specification of the API (e.g., OpenAPI YAML string). In Backstage, this can also use the `$text:` file reader directive (e.g., `$text: ./openapi.yaml`).

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
- `backstage.io/source-location`: Explicit repository source URL.
- `backstage.io/view-url` / `backstage.io/edit-url`: Custom UI links for viewing or editing source.
- `github.com/project-slug`: GitHub integration (`owner/repo`).
- `gitlab.com/project-slug`: GitLab integration (`group/subgroup/repo`).
- `sentry.io/project-slug`: Sentry error tracking dashboard integration.
- `pagerduty.com/integration-key`: PagerDuty service key for on-call status.
- `circleci.com/project-slug` / `jenkins.io/job-full-name`: CI/CD pipeline tracking.

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
