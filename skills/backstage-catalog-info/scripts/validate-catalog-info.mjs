#!/usr/bin/env node
// Offline validation of Backstage catalog descriptors.
//
// Usage: node validate-catalog-info.mjs <file-or-directory>... [--json]
//
// Checks, per YAML document: parse errors and duplicate keys, the entity
// envelope, metadata field formats, the kind-specific schema (standard kinds
// and scaffolder v1beta3 Templates), $text/$json/$yaml substitutions, entity
// reference resolution with the built-in processor's defaults, duplicate
// identities across the given files, Location targets, and catalog-managed
// fields that must not appear in source YAML.
//
// It cannot confirm ingestion by a live Backstage installation: readers,
// catalog.rules, custom processors and policies, and plugin behaviour are
// outside its view. Exit code 1 when any ERROR is found.

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve, relative } from 'node:path';
import { parseAllDocuments } from 'yaml';
import {
  entityEnvelopeSchemaValidator,
  entitySchemaValidator,
  FieldFormatEntityPolicy,
  parseEntityRef,
  stringifyEntityRef,
  apiEntityV1alpha1Validator,
  componentEntityV1alpha1Validator,
  domainEntityV1alpha1Validator,
  groupEntityV1alpha1Validator,
  locationEntityV1alpha1Validator,
  resourceEntityV1alpha1Validator,
  systemEntityV1alpha1Validator,
  userEntityV1alpha1Validator,
} from '@backstage/catalog-model';
import { templateEntityV1beta3Validator } from '@backstage/plugin-scaffolder-common';

const KIND_VALIDATORS = [
  apiEntityV1alpha1Validator,
  componentEntityV1alpha1Validator,
  domainEntityV1alpha1Validator,
  groupEntityV1alpha1Validator,
  locationEntityV1alpha1Validator,
  resourceEntityV1alpha1Validator,
  systemEntityV1alpha1Validator,
  userEntityV1alpha1Validator,
  templateEntityV1beta3Validator,
];

// spec fields that hold entity references, with the default kind the
// built-in processor applies. `null` means the author must write the kind.
const REFERENCE_FIELDS = {
  component: {
    owner: 'group', system: 'system', subcomponentOf: 'component',
    providesApis: 'api', consumesApis: 'api', dependsOn: null, dependencyOf: null,
  },
  api: { owner: 'group', system: 'system' },
  resource: { owner: 'group', system: 'system', dependsOn: null, dependencyOf: null },
  system: { owner: 'group', domain: 'domain' },
  domain: { owner: 'group', subdomainOf: 'domain' },
  group: { parent: 'group', children: 'group', members: 'user' },
  user: { memberOf: 'group' },
  template: { owner: 'group' },
};

const OUTPUT_ONLY_ROOT = ['relations', 'status'];
const OUTPUT_ONLY_METADATA = ['uid', 'etag'];
const OUTPUT_ONLY_ANNOTATIONS = [
  'backstage.io/managed-by-location',
  'backstage.io/managed-by-origin-location',
  'backstage.io/orphan',
];

const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// ---------------------------------------------------------------- input

const argv = process.argv.slice(2);
const asJson = argv.includes('--json');
const inputs = argv.filter(a => !a.startsWith('--'));
if (inputs.length === 0) {
  console.error('Usage: node validate-catalog-info.mjs <file-or-directory>... [--json]');
  process.exit(2);
}

function collectFiles(path) {
  const abs = resolve(path);
  if (!existsSync(abs)) return [{ path: abs, missing: true }];
  if (!statSync(abs).isDirectory()) return [{ path: abs }];
  const out = [];
  for (const entry of readdirSync(abs, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = join(abs, entry.name);
    if (entry.isDirectory()) out.push(...collectFiles(full));
    else if (/^catalog-info\.ya?ml$/.test(entry.name)) out.push({ path: full });
  }
  return out;
}

const files = inputs.flatMap(collectFiles);

// ---------------------------------------------------------------- findings

const findings = []; // { level, file, doc, line, message }
function report(level, ctx, message) {
  findings.push({ level, file: ctx.file, doc: ctx.index, line: ctx.line, message });
}
const error = (ctx, m) => report('ERROR', ctx, m);
const warn = (ctx, m) => report('WARN', ctx, m);
const info = (ctx, m) => report('INFO', ctx, m);

function display(path) {
  const rel = relative(process.cwd(), path);
  return rel && !rel.startsWith('..') ? rel : path;
}

function lineOf(source, offset) {
  return source.slice(0, offset).split('\n').length;
}

// ---------------------------------------------------------------- helpers

function entityNamespace(entity) {
  return entity.metadata?.namespace || 'default';
}

function identityOf(entity) {
  return stringifyEntityRef({
    kind: String(entity.kind),
    namespace: entityNamespace(entity),
    name: entity.metadata.name,
  });
}

function isSubstitution(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const keys = Object.keys(value);
  return keys.length === 1 && ['$text', '$json', '$yaml'].includes(keys[0]);
}

function isUrl(target) {
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(target);
}

// Replace substitution mappings with the content the processor would load,
// so that kind validation sees the resolved shape. Returns a deep copy.
function resolveSubstitutions(value, ctx, baseDir, path = 'spec') {
  if (Array.isArray(value)) {
    return value.map((v, i) => resolveSubstitutions(v, ctx, baseDir, `${path}[${i}]`));
  }
  if (!value || typeof value !== 'object') return value;
  if (isSubstitution(value)) {
    const [key] = Object.keys(value);
    const target = value[key];
    if (typeof target !== 'string' || target.length === 0) {
      error(ctx, `${path}: ${key} must be a non-empty string path or URL`);
      return '';
    }
    if (isUrl(target)) {
      info(ctx, `${path}: ${key} loads ${target}; not fetched. Confirm the backend reader can access it (integrations or backend.reading.allow).`);
      return key === '$text' ? `<remote ${target}>` : {};
    }
    const abs = resolve(baseDir, target);
    if (!existsSync(abs)) {
      error(ctx, `${path}: ${key} target does not exist: ${target} (resolved from the descriptor folder)`);
      return key === '$text' ? '' : {};
    }
    const text = readFileSync(abs, 'utf8');
    if (key === '$text') return text;
    try {
      // $json and $yaml both accept YAML (JSON is a YAML subset).
      const docs = parseAllDocuments(text);
      return docs.length === 1 ? docs[0].toJS() : docs.map(d => d.toJS());
    } catch (e) {
      error(ctx, `${path}: ${key} target ${target} could not be parsed: ${e.message}`);
      return {};
    }
  }
  const out = {};
  for (const [k, v] of Object.entries(value)) {
    out[k] = resolveSubstitutions(v, ctx, baseDir, `${path}.${k}`);
  }
  return out;
}

async function runKindValidators(entity, ctx) {
  let matched = false;
  for (const validator of KIND_VALIDATORS) {
    try {
      if (await validator.check(entity)) matched = true;
    } catch (e) {
      matched = true;
      error(ctx, `kind schema: ${e.message}`);
    }
  }
  if (!matched) {
    warn(ctx, `no built-in validator for ${entity.apiVersion} ${entity.kind}; confirm the installation defines this kind and version`);
  }
}

function checkOutputOnlyFields(entity, ctx) {
  for (const field of OUTPUT_ONLY_ROOT) {
    if (field in entity) error(ctx, `root "${field}" is catalog output; remove it from source YAML`);
  }
  for (const field of OUTPUT_ONLY_METADATA) {
    if (entity.metadata && field in entity.metadata) error(ctx, `metadata.${field} is catalog output; remove it from source YAML`);
  }
  for (const key of OUTPUT_ONLY_ANNOTATIONS) {
    if (entity.metadata?.annotations && key in entity.metadata.annotations) {
      error(ctx, `annotation ${key} is set by the catalog during ingestion; remove it`);
    }
  }
}

function checkMetadataConventions(entity, ctx, baseDir, formatsOk) {
  const { metadata } = entity;
  if (formatsOk && !KEBAB.test(metadata.name)) {
    warn(ctx, `metadata.name "${metadata.name}" is valid but not lowercase kebab-case; keep it if it is an existing identity`);
  }
  const annotations = metadata.annotations || {};
  for (const [k, v] of Object.entries(annotations)) {
    if (typeof v !== 'string') error(ctx, `annotation ${k} must be a string; quote numeric or boolean-looking values`);
  }
  const techdocs = annotations['backstage.io/techdocs-ref'];
  if (typeof techdocs === 'string' && techdocs.startsWith('dir:')) {
    const dir = resolve(baseDir, techdocs.slice(4));
    if (!existsSync(join(dir, 'mkdocs.yml')) && !existsSync(join(dir, 'mkdocs.yaml'))) {
      warn(ctx, `backstage.io/techdocs-ref points at ${techdocs} but no mkdocs.yml was found there`);
    }
  }
  const source = annotations['backstage.io/source-location'];
  if (typeof source === 'string' && !/^[a-z]+:/.test(source)) {
    error(ctx, `backstage.io/source-location must start with a location type such as "url:"`);
  }
}

function collectReferences(entity, ctx) {
  const kind = entity.kind.toLowerCase();
  const fields = REFERENCE_FIELDS[kind];
  if (!fields) return [];
  const refs = [];
  const defaultNamespace = entityNamespace(entity);
  for (const [field, defaultKind] of Object.entries(fields)) {
    const raw = entity.spec?.[field];
    if (raw === undefined || raw === null) continue;
    const values = Array.isArray(raw) ? raw : [raw];
    values.forEach((value, i) => {
      const where = Array.isArray(raw) ? `spec.${field}[${i}]` : `spec.${field}`;
      if (typeof value !== 'string' || value.length === 0) {
        error(ctx, `${where} must be a non-empty entity reference string`);
        return;
      }
      try {
        const parsed = parseEntityRef(value, {
          defaultNamespace,
          ...(defaultKind ? { defaultKind } : {}),
        });
        const full = stringifyEntityRef(parsed);
        if (field === 'owner' && !['group', 'user'].includes(parsed.kind)) {
          warn(ctx, `${where} resolves to ${full}; owners are normally a Group or a User`);
        }
        refs.push({ field: where, raw: value, full, ctx });
      } catch (e) {
        const hint = defaultKind === null
          ? ` (${field} has no default kind; write component:… or resource:…)`
          : '';
        error(ctx, `${where} "${value}" cannot be resolved${hint}: ${e.message}`);
      }
    });
  }
  return refs;
}

function checkLocationTargets(entity, ctx, baseDir) {
  const spec = entity.spec || {};
  const targets = [spec.target, ...(spec.targets || [])].filter(Boolean);
  if (targets.length === 0) info(ctx, 'Location declares no target or targets');
  for (const target of targets) {
    if (typeof target !== 'string') { error(ctx, 'Location targets must be strings'); continue; }
    if (isUrl(target)) { info(ctx, `Location target ${target} not fetched`); continue; }
    if (/[*?]/.test(target)) {
      warn(ctx, `Location target ${target} uses a glob; only some readers support patterns, check the configured reader`);
      continue;
    }
    if (!existsSync(resolve(baseDir, target))) {
      const level = spec.presence === 'optional' ? warn : error;
      level(ctx, `Location target does not exist: ${target}`);
    }
  }
}

// ---------------------------------------------------------------- main

const envelopeValidator = entityEnvelopeSchemaValidator();
const entityValidator = entitySchemaValidator();
const fieldFormats = new FieldFormatEntityPolicy();

const declared = new Map(); // identity -> [ctx]
const allRefs = [];

for (const file of files) {
  const fileCtx = { file: display(file.path), index: 0, line: 1 };
  if (file.missing) { error(fileCtx, 'path does not exist'); continue; }
  const source = readFileSync(file.path, 'utf8');
  const baseDir = dirname(file.path);

  let documents;
  try {
    documents = parseAllDocuments(source, { uniqueKeys: true });
  } catch (e) {
    error(fileCtx, `YAML could not be parsed: ${e.message}`);
    continue;
  }
  if (documents.length === 0) { warn(fileCtx, 'file contains no YAML documents'); continue; }

  for (const [index, doc] of documents.entries()) {
    const ctx = { ...fileCtx, index: index + 1, line: lineOf(source, doc.range?.[0] ?? 0) };
    if (doc.errors.length) {
      for (const e of doc.errors) error(ctx, `YAML: ${e.message.split('\n')[0]}`);
      continue;
    }
    const raw = doc.toJS();
    if (raw === null || raw === undefined) { info(ctx, 'empty document skipped'); continue; }

    let entity;
    try {
      envelopeValidator(raw);
    } catch (e) {
      error(ctx, `entity envelope: ${e.message}`);
      continue;
    }
    try {
      entity = entityValidator(raw);
    } catch (e) {
      // Report the first schema problem, then keep checking with the raw
      // document so that one mistake does not hide the others.
      error(ctx, `entity schema: ${e.message}`);
      entity = raw;
    }
    ctx.label = identityOf(entity);

    checkOutputOnlyFields(entity, ctx);
    let formatsOk = true;
    try {
      await fieldFormats.enforce(entity);
    } catch (e) {
      formatsOk = false;
      error(ctx, `field format: ${e.message}`);
    }
    checkMetadataConventions(entity, ctx, baseDir, formatsOk);

    const resolved = { ...entity, spec: resolveSubstitutions(entity.spec, ctx, baseDir) };
    if (entity.kind.toLowerCase() === 'api') {
      const def = entity.spec?.definition;
      if (isSubstitution(def) && Object.keys(def)[0] !== '$text') {
        error(ctx, 'spec.definition must resolve to a string; use $text, not $json or $yaml');
      }
      if (typeof resolved.spec.definition === 'string' && resolved.spec.definition.trim().length === 0) {
        error(ctx, 'spec.definition is empty; an API needs the actual contract, not a link');
      }
    }
    await runKindValidators(resolved, ctx);

    if (entity.kind.toLowerCase() === 'location') checkLocationTargets(entity, ctx, baseDir);

    const identity = ctx.label.toLowerCase();
    if (!declared.has(identity)) declared.set(identity, []);
    declared.get(identity).push(ctx);
    allRefs.push(...collectReferences(entity, ctx));
  }
}

for (const [identity, contexts] of declared) {
  if (contexts.length > 1) {
    for (const ctx of contexts) {
      error(ctx, `duplicate identity ${identity}; also declared in ${contexts.filter(c => c !== ctx).map(c => `${c.file} doc ${c.index}`).join(', ')}`);
    }
  }
}

const unresolved = new Map();
for (const ref of allRefs) {
  if (!declared.has(ref.full.toLowerCase())) {
    if (!unresolved.has(ref.full)) unresolved.set(ref.full, []);
    unresolved.get(ref.full).push(ref);
  }
}
for (const [target, refs] of unresolved) {
  const by = refs.map(r => `${r.ctx.label} ${r.field}`).join(', ');
  info(refs[0].ctx, `${target} is not declared in the given files (referenced by ${by}); confirm it exists in the catalog or is provided elsewhere`);
}

// ---------------------------------------------------------------- output

const counts = { ERROR: 0, WARN: 0, INFO: 0 };
for (const f of findings) counts[f.level]++;

if (asJson) {
  console.log(JSON.stringify({ files: files.map(f => display(f.path)), entities: [...declared.keys()], findings, counts }, null, 2));
} else {
  const order = { ERROR: 0, WARN: 1, INFO: 2 };
  findings.sort((a, b) => a.file.localeCompare(b.file) || a.doc - b.doc || order[a.level] - order[b.level]);
  for (const f of findings) {
    const where = f.doc ? `${f.file}:${f.line} (doc ${f.doc})` : f.file;
    console.log(`${f.level.padEnd(5)} ${where}: ${f.message}`);
  }
  console.log(`\n${declared.size} entit${declared.size === 1 ? 'y' : 'ies'} in ${files.length} file${files.length === 1 ? '' : 's'}: ${counts.ERROR} error(s), ${counts.WARN} warning(s), ${counts.INFO} note(s).`);
  console.log(counts.ERROR === 0
    ? 'Local YAML, schema, and reference checks passed. Ingestion by the target installation is not verified.'
    : 'Fix the errors above before registering the descriptor.');
}

process.exit(counts.ERROR > 0 ? 1 : 0);
