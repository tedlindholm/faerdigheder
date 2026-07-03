---
name: backstage-catalog-info
description: Create, update, or validate a Backstage catalog-info.yaml file following the official Software Catalog descriptor format specification. Use when authoring metadata, ownership, entity references, dependencies, and integrations for services, APIs, resources, systems, domains, users, groups, or templates.
---

# Backstage Catalog Info

Generate, update, and validate standard Backstage descriptor files (`catalog-info.yaml`) to register software entities and metadata in the Backstage Software Catalog.

## What to do

### Phase 1 — Identify Entity Kind & Purpose
1. Determine the target entity `kind` based on what is being cataloged:
   - `Component`: Individual software units (services, websites, libraries, pipelines).
   - `API`: API interfaces and contracts (OpenAPI, gRPC, GraphQL, AsyncAPI).
   - `Resource`: Infrastructure or dependencies (databases, S3 buckets, queues, clusters).
   - `System`: Collections of components and APIs serving a unified business purpose.
   - `Domain`: High-level organizational boundaries wrapping systems.
   - `User` / `Group`: Organizational hierarchy, teams, and individuals.
   - `Template`: Software Scaffolder templates for creating new projects.
   - `Location`: References to external catalog files or directories.

### Phase 2 — Populate Envelope & Metadata
2. Define the top-level envelope (`apiVersion`, `kind`, and `metadata`):
   - `apiVersion`: Use `backstage.io/v1alpha1` for all kinds **except** `Template`. For `Template` entities, use `backstage.io/v1beta2` or `scaffolder.backstage.io/v1beta3`. Using `v1alpha1` on a Template will fail validation.
   - `name` (**required**): Max 63 characters, lowercase alphanumeric or hyphens, DNS-subdomain compliant (`^[a-z0-9]+(-[a-z0-9]+)*$`).
   - `namespace` (*optional*): Defaults to `"default"` if omitted. Max 63 characters, lowercase alphanumeric/hyphens.
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
   - For `System` / `Domain`: Set `domain` (on System) to build the organizational hierarchy.

### Phase 4 — Format Entity References Correctly
4. Ensure all entity reference strings follow the Backstage specification:
   - Format: `[<kind>:][<namespace>/]<name>`
   - Prefer explicit references for clarity: use `group:billing-team` or `system:default/billing-system` instead of bare strings when pointing across kinds or namespaces.

### Phase 5 — Attach Integrations & Annotations
5. Add well-known `metadata.annotations` to enable Backstage plugins:
   - `backstage.io/techdocs-ref`: Point to documentation (e.g., `dir:.` or `dir:./docs`).
   - `github.com/project-slug`: GitHub integration formatted as `owner/repo`.
   - `dev.azure.com/project-repo`: Azure DevOps integration formatted as `<project>/<repo>`.
   - `backstage.io/source-location`: Explicit source repository reference. **Must** use the `url:` prefix (e.g., `url:https://github.com/org/repo/` or `url:https://dev.azure.com/org/proj/_git/repo/`). If pointing to a folder, include a trailing slash. Do NOT manually add `managed-by-*` annotations.
   - Add other CI/CD, Sentry, or cloud provider annotations as appropriate.

### Phase 6 — Validate & Output
6. Ensure YAML syntax is strictly valid. If defining multiple entities in a single file (e.g., a Component and its provided API), separate them with `---`.
7. Verify against the schema guidelines in `references/backstage-descriptor-reference.md`.
8. *Optional CLI validation*: If the user wants an automated CLI check against exact Backstage rules, suggest:
   ```bash
   npx @roadiehq/backstage-entity-validator --path catalog-info.yaml
   ```

## Supporting info

- See [backstage-descriptor-reference.md](file:///Users/ted/Repos/faerdigheder/skills/backstage-catalog-info/references/backstage-descriptor-reference.md) for full field schemas, entity reference syntax rules, complete annotation lists, and copy-pasteable YAML examples for every major kind.
