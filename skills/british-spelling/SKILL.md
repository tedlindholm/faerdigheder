---
name: british-spelling
description: Enforce British English spelling, vocabulary, and common phrasing across project-owned code and prose. Use when reviewing or rewriting text for British English while preserving external contracts and context-specific terms.
---

# British Spelling

Apply British English spelling and usage consistently in project-owned language.

## What to do

1. Scan for common American spellings such as `serialize`, `optimize`, `color`, `behavior`, `canceled`, `fulfill`, `defense`, `gray`, and `pediatric`.
2. Replace them with British forms such as `serialise`, `optimise`, `colour`, `behaviour`, `cancelled`, `fulfil`, `defence`, `grey`, and `paediatric`.
3. In prose and interface text, prefer established British vocabulary and phrasing when the context supports it.
4. Preserve external contracts such as third-party APIs, CSS properties, JSON fields, URLs, and public identifiers you do not control.
5. Return corrected text and, when useful, call out notable replacements or deliberate exceptions.

## Supporting info

- Prefer `-ise` over `-ize` and `-yse` over `-yze` in project-owned language.
- Prefer `-our` over `-or` and `-re` over `-er` where applicable.
- Double the L before suffixes: `cancelled`, `modelling`, `travelled`.
- Prefer single L in `fulfil`, `enrol`, `instil`, `skilful`.
- Prefer `-ence` over `-ense`: `defence`, `offence`, `pretence`.
- Preserve ae/oe digraphs: `paediatric`, `manoeuvre`, `encyclopaedia`.
- Use `licence` as a noun and `license` as a verb.
- See `references/british-spelling-reference.md` for the full conversion guide.
- See `references/british-american-usage.md` when reviewing vocabulary, instructions, or complete sentences.
- See `references/general-spelling-rules.md` for general English spelling rules (doubling consonants, silent e, plurals, commonly misspelt words, etc.).
