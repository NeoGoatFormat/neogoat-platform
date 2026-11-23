# NeoGoat Pro — December 2026 deck posts

These are the exact 20 default decks included with NeoGoat Pro 0.3.2 beta.78,
December v7. They use the ordinary Deck Library post structure and the existing
description / Read More controls. Each post credits `neogoat pro`, contains an
English strategy and Side Deck guide, and selects exactly three distinct cards
from its Main or Extra Deck for thumbnails.

## Sources

- `dec_2026/` preserves the original release YDK bytes, including filenames and
  line endings. The Windows ZIP, extracted release and December Type A bank
  agree byte for byte for all 20 files.
- `source-manifest-dec-2026.json` records the release SHA-256, native format hash,
  source YDK hashes and section counts. The web pool hash is normalized to LF so
  verification works on both Windows and Linux Git checkouts.
- `play-guides-dec-2026.json` contains the reviewed English editorial source.
- `community-posts-dec-2026.json` contains the generated normal post payloads.
  Database IDs and dates are assigned when published. These payloads include
  card passwords for image/export resolution and the same name/quantity-based
  duplicate signature as the Share Deck form.

The release archive is `NeoGoat-Pro-Windows-0.3.2-beta.78-Diciembre-v7.zip`,
SHA-256 `8d7ea16c68b7584dad2b343e53fd24fe30b7b4f258ccdbe25638c56a9cd7bade`.
The native format is `75CA0D55`, with 2,231 entries. All decks have 40 Main and
15 Side cards; Bonfire Hero has 5 Extra cards, Cyberdark Armed Dragon has 2,
Ninja Phoenix has 15, and the other decks have none. Wind Skill Drain includes
the released one copy of The Tricky.

## Reproduction

```sh
node tools/build-december-profiles.js
node tools/build-december-profiles.js --check
node tests/december-profiles.test.js
```

Generation validates source hashes, December legality across all three zones,
section placement, source inventories, duplicate signatures and thumbnail
membership. Known alternate artwork passwords resolve to the format's card
identity. This does not alter source YDKs or card quantities. The descriptive
Side guidance is situational advice, not a claim of measured matchup results.

Generating files does not publish them. Check existing slugs and signatures
before publishing; preserve October and other authors' posts. No separate deck
collection, special UI or schema change is required.
