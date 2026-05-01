---
name: british-spelling
description: Enforce British English spelling across code, documentation, error messages, and messages to users. Use when reviewing or rewriting technical text to replace American spellings with British forms while preserving external API identifiers.
---

# British Spelling

Apply British English consistently in project-owned language.

## What to do

1. Scan for common American spellings such as `serialize`, `optimize`, `color`, `behavior`, `canceled`, `fulfill`, `defense`, `gray`, and `pediatric`.
2. Replace them with British forms such as `serialise`, `optimise`, `colour`, `behaviour`, `cancelled`, `fulfil`, `defence`, `grey`, and `paediatric`.
3. Preserve external contracts such as third-party APIs, CSS properties, JSON fields, URLs, and public identifiers you do not control.
4. Return corrected text and, when useful, call out notable replacements or deliberate exceptions.

## Supporting info

- Prefer `-ise` over `-ize` and `-yse` over `-yze` in project-owned language.
- Prefer `-our` over `-or` and `-re` over `-er` where applicable.
- Double the L before suffixes: `cancelled`, `modelling`, `travelled`.
- Prefer single L in `fulfil`, `enrol`, `instil`, `skilful`.
- Prefer `-ence` over `-ense`: `defence`, `offence`, `pretence`.
- Preserve ae/oe digraphs: `paediatric`, `manoeuvre`, `encyclopaedia`.
- Use `licence` as a noun and `license` as a verb.
- See `references/british-spelling-reference.md` for the full conversion guide.
- See `references/general-spelling-rules.md` for general English spelling rules (doubling consonants, silent e, plurals, commonly misspelt words, etc.).
