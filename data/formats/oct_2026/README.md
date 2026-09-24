# NeoGoat October 2026

This pool inherits August 2026 and applies the [published October banlist](https://neogoatformat.blogspot.com/2026/09/neogoat-october-2026-banlist.html), verified on September 23, 2026.

- 17 existing cards change copy limits.
- 6 cards enter the Extra Card Pool: Gozuki, Future Fusion, Crystal Seer, Exploder Dragon, Cyberdark Keel and Mist Archfiend.
- 4 cards leave the pool: Foolish Return, Miracle Fertilizer, Overload Fusion and Rai-Mei.
- Total: **2229 entries** (33 forbidden, 49 limited, 25 semi-limited, 2122 unlimited). Forbidden entries remain visible to the builder but cannot be added to a deck; removed entries are absent.

`changes.json` records every changed ID, the source URL and the frozen August source hash. The blog's “Harpie's Oracle” maps to **Harpie Oracle (66386380)**, not a new card. New-card metadata was checked against the public YGOPRODeck API; its current texts do not establish a NeoGoat engine ruling or errata policy. All inherited metadata stays unchanged.

`cards_oct_2026.json` is a complete, standalone array in the existing builder schema. It does not depend on `cards_catalog.json`. Earlier format files are preserved byte for byte. This change does not update NeoGoat Pro clients, bots, servers or duel rules.

## Regeneration and tests

From the repository root, with Node.js (no package installation or network required):

```sh
node tools/build-october-2026.js
node tools/build-october-2026.js --check
node tests/formats.test.js
node tests/ydke.test.js
```

The generator refuses a changed August source. Its SHA-256 pins the original Git blob (LF line endings), allowing only Git's CRLF checkout conversion on Windows. The tests independently verify the exact delta, uniqueness, metadata preservation and the builder's actual forbidden/copy-limit checks, including shared Main/Side counts.

## Activation

Adding the October data does not itself switch the live builder. `data/config.json` selects its active format. The October pair is `currentFormatId: "oct_2026"` and `rulesFile: "cards_oct_2026.json"`. August remains selected until October activation is requested.
