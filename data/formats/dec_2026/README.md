# NeoGoat December 2026 — Draft

**Work in progress. October 2026 remains the active format.**

This draft inherits the complete October 2026 pool and records the maintainer's December planning decisions. It will be updated as further changes are defined. It is not the final December banlist.

## Cumulative changes through November 10, 2026

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
| Future Fusion | Semi-limited (2) | Unlimited (3) |
| Miracle Fusion | Semi-limited (2) | Unlimited (3) |
| Dark Spirit's Mastery | Unlimited (3) | Semi-limited (2) |
| Gozuki | Semi-limited (2) | Unlimited (3) |

All other retained cards keep their October copy limits. Forbidden cards remain in the data with a zero-copy limit.

### Extra Card Pool

The following nine cards leave the Extra Card Pool:

- Arcane Barrier
- Elemental HERO Prisma
- Fifth Hope
- Fog King
- Goldd, Wu-Lord of Dark World
- Magical Exemplar
- Needlebug Nest
- Spell Power Grasp
- The Eye of Timaeus

These cards are absent from the December file. Retained October entries preserve their metadata, with only the banlist changes above applied.

The following nine cards enter the Extra Card Pool, provisionally unlimited (three copies each):

- Chaos Distill
- Mei-Kou, Master of Barriers
- Koa'ki Meiru Gravirose
- Surface
- Poseidon Wave
- Cyberdark Edge
- Valhalla, Hall of the Fallen
- Soul Servant
- Victory Viper XX03

No individual limits have been specified for these additions yet. Cyberdark Keel is inherited from October.

Earlier additions were checked against YGOPRODeck. Mei-Kou identity and stats were checked against the installed card database and the official TCG database. Their English card texts follow the official TCG database references in `changes.json`, including the current Surface and Cyberdark texts. This is card metadata, not a change to NeoGoat engine scripts or rulings.

Current draft: **2229 entries** (33 forbidden, 50 limited, 21 semi-limited, 2125 unlimited), with nine removals, nine additions and eleven changes to retained cards' copy limits.

## Revision recorded on November 9, 2026

Snipe Hunter has been withdrawn from the December draft and replaced by Mei-Kou, Master of Barriers at three copies. Chaos Trap Hole returns to the December pool with its October unlimited status (three copies). These changes do not activate December as the current format.

Mei-Kou's LIGHT Attribute, Level 4, 1700 ATK, 600 DEF and current English text were checked against the [official card database](https://www.db.yugioh-card.com/yugiohdb/card_search.action?cid=7116&ope=2&request_locale=en).

## Revision recorded on November 10, 2026

Mobius the Frost Monarch returns to **two copies (semi-limited)**, matching its October limit. Its earlier one-copy restriction has been removed from the cumulative changes. October remains the active format.

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
