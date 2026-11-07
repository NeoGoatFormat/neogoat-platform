# NeoGoat December 2026 — Draft

**Work in progress. October 2026 remains the active format.**

This draft inherits the complete October 2026 pool and records the maintainer's December planning decisions. It will be updated as further changes are defined. It is not the final December banlist.

## Changes recorded on November 7, 2026

### Banlist

| Card | October limit | December draft limit |
| --- | --- | --- |
| Pot of Greed | Limited (1) | Forbidden (0) |
| Magical Stone Excavation | Semi-limited (2) | Forbidden (0) |
| Night Assailant | Limited (1) | Forbidden (0) |
| Pyramid Turtle | Forbidden (0) | Limited (1) |
| Graceful Charity | Forbidden (0) | Limited (1) |
| Lonefire Blossom | Semi-limited (2) | Limited (1) |
| Last Will | Forbidden (0) | Limited (1) |

All other retained cards keep their October copy limits. Forbidden cards remain in the data with a zero-copy limit.

### Extra Card Pool

The following ten cards leave the Extra Card Pool:

- Arcane Barrier
- Chaos Trap Hole
- Elemental HERO Prisma
- Fifth Hope
- Fog King
- Goldd, Wu-Lord of Dark World
- Magical Exemplar
- Needlebug Nest
- Spell Power Grasp
- The Eye of Timaeus

These cards are absent from the December file. Retained October entries preserve their metadata, with only the banlist changes above applied.

The following ten cards enter the Extra Card Pool, provisionally unlimited (three copies each):

- Chaos Distill
- Snipe Hunter
- Koa'ki Meiru Gravirose
- Surface
- Poseidon Wave
- Cyberdark Horn
- Cyberdark Edge
- Cyberdark Dragon
- Valhalla, Hall of the Fallen
- Soul Servant

No individual limits have been specified for these additions yet. Cyberdark Keel is inherited from October. Cyberdark Dragon is classified as a Fusion/Effect monster for Extra Deck placement.

New-card IDs and metadata were checked against YGOPRODeck. Their English card texts follow the official TCG database references in `changes.json`, including the current Surface and Cyberdark texts. This is card metadata, not a change to NeoGoat engine scripts or rulings.

Current draft: **2229 entries** (33 forbidden, 50 limited, 23 semi-limited, 2123 unlimited), with ten removals, ten additions and seven changes to retained cards' copy limits.

## Files and further edits

- `cards_dec_2026.json`: the complete December draft pool in the existing builder schema.
- `changes.json`: the cumulative changes relative to the frozen October base, with card IDs and previous limits.

For each subsequent decision, update `changes.json`, regenerate the pool and update this summary. The generator preserves inherited metadata and checks the October source hash. From the repository root:

```sh
node tools/build-december-2026.js
node tools/build-december-2026.js --check
node tests/formats.test.js
node tests/cardpool-data.test.js
```

The active configuration, format selectors, historical pools, NeoGoat Pro clients and server rules are unchanged. Activation will be handled separately once the December format is finalized.
