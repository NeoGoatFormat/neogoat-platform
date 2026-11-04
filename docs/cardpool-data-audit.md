# Visual Card Pool: data audit

Verified on November 4, 2026 against `data/formats/oct_2026/cards_oct_2026.json` and the sources below. The gallery reads that same JSON. It does not alter format rules, effects, passwords or copy limits.

## Schema and category counts

The source is an array of 2,229 cards, each with `password`, `name`, `type`, `subType`, `attribute`, `monsterType`, `class`, `level`, `atk`, `def`, `text`, `pool`, `printedinTCG`, and `ban_status`. Every password is a positive numeric string of at most eight digits; some retain leading zeroes. There are no duplicate numeric passwords or duplicate names in October.

| Source `pool` | Raw entries | Gallery classification |
| --- | ---: | ---: |
| Normal Goat Cardpool | 1,696 | 1,698 classic cards after the two documented exceptions |
| OCG Goat Cardpool | 391 | 390 OCG Exclusives |
| Added Structure Decks | 39 | 38 Structure Deck Additions |
| Extra Card Pool | 103 | 103 Extra Pool |

| Gallery category | All statuses | Playable (non-Forbidden) |
| --- | ---: | ---: |
| All Added Cards | 531 | 530 |
| OCG Exclusives | 390 | 389 |
| Structure Deck Additions | 38 | 38 |
| Extra Pool | 103 | 103 |
| Complete Card Pool | 2,229 | 2,196 |

These figures are this audit's results, not totals hardcoded in the application. All five categories filter the same normalized collection. The default includes Forbidden cards and marks them as unusable, so the full category counts remain visible.

The three card types are Monster (1,457), Spell (456), and Trap (316). Source `subType` values are Continuous, Effect, Normal, Equip, Quick-Play, Field, Ritual, Fusion, and Counter. Monster `class` adds Flip, Spirit, Toon, Union and other class information. The subtype filter accepts both fields, so Flip monsters are discoverable.

## Two source-backed classic exceptions

The existing project files have no independent classic-era release dates. `cards_catalog.json` repeats the existing origin labels and is incomplete for later additions, so it cannot independently settle classic reprints. A first TCG release date alone also cannot settle a regional Goat legality question.

All 533 entries outside `Normal Goat Cardpool` were compared by normalized name against the full [Duelingbook Goat Format card list](https://www.duelingbook.com/goat-format), under **Cards**. It has 1,708 listed names including historical aliases. Exactly two added-pool names already appear in that classic list:

| Password (unchanged) | Card | Original JSON pool | Gallery treatment |
| --- | --- | --- | --- |
| 28649820 | Embodiment of Apophis | OCG Goat Cardpool | Classic; excluded from OCG Exclusives and All Added Cards |
| 48642904 | Mesmeric Control | Added Structure Decks | Classic; excluded from Structure Deck Additions and All Added Cards |

[GoatFormat.com's card-pool policy](https://www.goatformat.com/cardpool.html) also explicitly includes SP1 through Embodiment of Apophis and the DOD promos. The two cards remain in Complete Card Pool, with their original JSON origin and NeoGoat status retained. `data/cardpool-classification.json` stores only these two IDs, names and sources; it does not duplicate the pool.

The OCG category means historical OCG additions as classified by this project, not cards still unprinted in the TCG today. Of its 390 entries after the classic exception, 240 have `printedinTCG: "Yes"` and 150 have `"No"`. Filtering solely on that flag would incorrectly discard most of this category.

## October banlist and Extra Pool discrepancy

Across the whole October pool there are 33 Forbidden, 49 Limited, 25 Semi-Limited and 2,122 Unlimited entries. Their displayed maximum copies are 0, 1, 2 and 3, respectively, taken from the existing status vocabulary. The gallery is a reference; it does not replace the builder's shared-name deck validation.

The Extra Pool has **103** entries: **89 Unlimited, 5 Limited and 9 Semi-Limited**, with no Forbidden entries. All belong to one gallery. This contradicts the current Blogger explanation that the Extra Pool never exceeds 90. The implementation preserves all October JSON entries and flags the discrepancy in this report; it does not remove cards, change rules, assume that 90 is the count, or silently treat only the Unlimited list as the Extra Pool.

The six October additions are present: Gozuki and Future Fusion are Semi-Limited; Crystal Seer, Exploder Dragon, Cyberdark Keel and Mist Archfiend are Unlimited. The four removals (Foolish Return, Miracle Fertilizer, Overload Fusion and Rai-Mei) are absent entirely and cannot appear as legal. These facts are also recorded in the project's `data/formats/oct_2026/changes.json` and the [published October update](https://neogoatformat.blogspot.com/2026/09/neogoat-october-2026-banlist.html).

## Updating and verification

Add future format versions through the gallery configuration and point them at the project's complete format JSON. Counts, statuses, filters and image IDs are then computed from that version. Do not copy lists or enter a target Extra Pool size. Keep the small classic exceptions only while their cited identities remain applicable; new or conflicting `pool` values require review and fail visibly instead of being silently classified. A new data set should be checked for classic reprints against the same documented source; do not infer historical exclusivity from current TCG printing status.

Run `node tests/cardpool-data.test.js` for the gallery's data regression checks. It verifies the five October counts, classic exclusions, source-object preservation, all banlist states, mixed-status Extra Pool, removed cards, an initially populated gallery, composed filters, Flip subtype, padded-password lookup, duplicate suppression, conflicting-data rejection and image fallbacks. The fixed numbers in that test describe the frozen October fixture, not application behavior. Existing format-generation and builder tests remain separate and should continue to pass.
