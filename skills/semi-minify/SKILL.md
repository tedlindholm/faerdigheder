---
name: semi-minify
description: Author-time identifier abbreviation for browser-only JavaScript. Shortens verbose names to reduce network payload while keeping committed source legible. Use when asked to abbreviate, shorten, or semi-minify identifiers in a browser .js file. Not a build step — whitespace and comment stripping belongs to an esbuild pass.
---

# Semi-Minify

Shorten verbose identifiers at author time to reduce bytes over the wire, keeping committed source legible in DevTools or when read directly.

## What to do

### Phase 1 — Inventory

1. Confirm the target file is a browser-only `.js` file (not a Node.js module, build script, or server-side file). Reject clearly if not.
2. Read the target `.js` file.
3. Collect every user-defined identifier (variable, function, parameter, class, and local type name).
4. From that list, remove:
   - a. Exported names (`export const`, `export function`, `export class`, `export default`, re-exports).
   - b. String literals used as error messages, log output, or attribute/key names.
   - c. Built-in browser identifiers — anything that is a property or method of `window`, `document`, `navigator`, `console`, `Event`, `Element`, or other platform globals (e.g. `addEventListener`, `getElementById`, `querySelector`).
   - d. Any identifier imported from an external module.
   - e. Single-letter loop variables and index names (`i`, `j`, `k`, `n`).

### Phase 2 — Syntax compaction

5. Scan for patterns that can be shortened with equivalent, readable syntax:
   - Single-expression arrow bodies: `(x) => { return x + 1 }` → `x => x + 1`
   - Redundant parens on single-param arrows: `(x) => x` → `x => x`
   - Shorthand object properties: `{ x: x, y: y }` → `{ x, y }`
   - Shorthand methods: `{ foo: function() {} }` → `{ foo() {} }`
   - Destructuring repeated member access: `obj.x … obj.y` → `const { x, y } = obj`
   - Simple `if/else` that only return or assign → ternary

6. Present each proposed change as a diff snippet and wait for approval before applying.

### Phase 3 — Identifier abbreviation

7. For each candidate from Phase 1, derive an abbreviation following the convention in `references/abbreviation-conventions.md`.
8. Present a **mapping table** to the user:

   | Original | Proposed | Occurrences |
   |----------|----------|-------------|
   | `normaliseConsumerSharedConfig` | `normCnsShrCfg` | 4 |
   | `reconstituteRemoteChildren` | `rcRmtCh` | 2 |
   | `validateExportedBindings` | `valEBnd` | 3 |

9. **Wait for explicit approval before continuing.** The user may accept all, reject individual rows, or supply alternative short forms.

### Phase 4 — Apply

10. Apply all approved syntax changes and renames across the whole file.
11. Do not alter anything not in the approved set.
12. Confirm changes applied.

## What this skill does not do

- Auto-abbreviate on every build — non-deterministic and breaks debugging.
- Rename identifiers without approval.
- Strip whitespace or comments — use an esbuild pass (`--minify-whitespace --minify-syntax`) for that.

## Supporting info

- See `references/abbreviation-conventions.md` for the word-to-short-form mapping table and constraints.
