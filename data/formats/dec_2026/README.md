# NeoGoat December 2026

**Final list supplied on November 11, 2026. October 2026 remains the active format.**

December is rebuilt from the complete, frozen October 2026 pool using only the maintainer's final list. This replaces all earlier December drafts and includes the maintainer's subsequent November 11 additions of Chaos Distill and Koa'ki Meiru Gravirose at three copies each.

## Banlist changes from October

| Card | October limit | December limit |
| --- | --- | --- |
| Night Assailant | Limited (1) | Forbidden (0) |
| Magical Stone Excavation | Semi-limited (2) | Forbidden (0) |
| Pot of Greed | Limited (1) | Forbidden (0) |
| Mobius the Frost Monarch | Semi-limited (2) | Limited (1) |
| Pyramid Turtle | Forbidden (0) | Limited (1) |
| Graceful Charity | Forbidden (0) | Limited (1) |
| Crush Card Virus | Semi-limited (2) | Limited (1) |
| Dark Spirit's Mastery | Unlimited (3) | Semi-limited (2) |
| Miracle Fusion | Semi-limited (2) | Unlimited (3) |
| Future Fusion | Semi-limited (2) | Unlimited (3) |
| Mage Power | Semi-limited (2) | Unlimited (3) |

All other retained cards keep their October limits and metadata. In particular, Gozuki and Lonefire Blossom remain semi-limited (2), Last Will remains forbidden (0), and Fog King, Chaos Trap Hole and Cyberdark Keel remain unlimited (3). Forbidden cards remain in the data with a zero-copy limit.

## Extra Card Pool

These nine cards leave the pool and are absent from the December file:

- Elemental HERO Prisma
- Elemental HERO Nova Master
- Fifth Hope
- Arcane Barrier
- Goldd, Wu-Lord of Dark World
- Magical Exemplar
- Needlebug Nest
- Spell Power Grasp
- The Eye of Timaeus

These eleven cards enter the pool:

| Card | December limit |
| --- | --- |
| Ninja Grandmaster Hanzo | Semi-limited (2) |
| Soul Servant | Semi-limited (2) |
| Surface | Unlimited (3) |
| Dweller in the Depths | Unlimited (3) |
| Valhalla, Hall of the Fallen | Unlimited (3) |
| Mei-Kou, Master of Barriers | Unlimited (3) |
| Elemental HERO Escuridao | Unlimited (3) |
| Rage of the Deep Sea | Unlimited (3) |
| Fish Depth Charge | Unlimited (3) |
| Chaos Distill | Unlimited (3) |
| Koa'ki Meiru Gravirose | Unlimited (3) |

Earlier proposed additions omitted from this final list are not part of December: Snipe Hunter, Poseidon Wave, Cyberdark Edge and Victory Viper XX03.

New card identities and stats were checked against YGOPRODeck. Their English texts follow the official TCG database references in `changes.json`. These are card metadata; this update does not alter NeoGoat engine scripts or rulings.

December contains **2231 entries**: 34 forbidden, 49 limited, 22 semi-limited and 2126 unlimited. The Extra Card Pool contains **105 entries**. Relative to October, there are nine removals, eleven additions and eleven changes to retained cards' copy limits.

## Files and generation

- `cards_dec_2026.json`: the complete December pool in the existing builder schema.
- `changes.json`: the final changes relative to the frozen October base, including card IDs, previous limits and source links.

The generator preserves inherited metadata and checks the October source hash. After editing the manifest, regenerate the pool and update this summary. From the repository root:

```sh
node tools/build-december-2026.js
node tools/build-december-2026.js --check
node tests/formats.test.js
node tests/cardpool-data.test.js
```

October remains selected in `data/config.json`. Public activation and client/server deployment are managed separately.
