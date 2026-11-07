# NeoGoat December 2026 — Draft

**Work in progress. October 2026 remains the active format.**

This draft inherits the complete October 2026 pool and records the maintainer's December planning decisions. It will be updated as further changes are defined. It is not the final December banlist.

## Changes recorded on November 7, 2026

The following nine cards leave the Extra Card Pool:

- Arcane Barrier
- Chaos Trap Hole
- Elemental HERO Prisma
- Fifth Hope
- Fog King
- Goldd, Wu-Lord of Dark World
- Magical Exemplar
- Needlebug Nest
- Spell Power Grasp

These cards are absent from the December file. Every other October entry, its metadata and its copy limit remain unchanged. No additions or copy-limit changes have been defined yet.

Current draft: **2220 entries** (33 forbidden, 48 limited, 25 semi-limited, 2114 unlimited).

## Files and further edits

- `cards_dec_2026.json`: the complete December draft pool in the existing builder schema.
- `changes.json`: the cumulative changes relative to the frozen October base, with card IDs and previous limits.

For each subsequent decision, update `changes.json`, regenerate the pool and update this summary. The generator preserves inherited entries and checks the October source hash. From the repository root:

```sh
node tools/build-december-2026.js
node tools/build-december-2026.js --check
node tests/formats.test.js
node tests/cardpool-data.test.js
```

The active configuration, format selectors, historical pools, NeoGoat Pro clients and server rules are unchanged. Activation will be handled separately once the December format is finalized.
