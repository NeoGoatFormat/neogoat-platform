# NeoGoat Pro — October 2026 deck posts

These are the 20 default decks shipped with NeoGoat Pro 0.3.2 beta.60. They are published through the same deck-post API as the existing Share Deck form and appear in [Deck Library](https://neogoat-platform.vercel.app/decks.html) as ordinary posts. Play and Side Deck guides are English text inside each post's description, accessible with the existing Read More control. No separate collection, special badges or guide panels are used.

## Sources and fidelity

- `oct_2026/`: exact original YDK bytes, including line endings.
- `source-manifest-oct-2026.json`: release provenance and individual SHA-256 hashes.
- `play-guides-oct-2026.json`: reviewed English play guides.
- `side-guides-oct-2026.json`: English Side card explanations and 105 matchup plans.
- `neogoat-pro-oct-2026.json`: generated build/validation artifact, not a separate website collection.
- `community-posts-oct-2026.json`: generated ordinary-post payloads with full descriptions and the existing form's duplicate signatures. Database IDs and creation dates are assigned on publication.

The source is the final Windows beta.60 archive, SHA-256 `d2906d2ac46495156f765d8404d5f690b9c94bf76745c01908c51a1fdb8343df`, matching Android distribution inputs. Personal decks are excluded. The native October format hash is `8A84D6ED`; the website uses `oct_2026` and its 2,229 pool entries.

The Side review was adapted to final beta.60 lists: Armed Dragon has one Level Up! and three Flying Kamakiri #1; Insect Normal has Nobleman of Crossout in Main and two 4-Starred Ladybug of Doom in Side. Details are recorded in the manifest.

Apply each Side plan separately to the original deck list. Tests check source-card availability, equal swap counts, unchanged inventory and October legality. These checks do not establish performance in human matches or a competitive ranking.

## Build and test

From the repository root, without private project files or network access:

```sh
node tools/build-default-profiles.js
node tools/build-default-profiles.js --check
node tests/default-profiles.test.js
node tests/formats.test.js
node tests/ydke.test.js
```

Optional browser regression (requires Playwright and Chromium):

```sh
node tests/profiles-ui.test.js
```

The browser test uses local API fixtures and never posts test data. It checks ordinary library entries, descriptions, Read More, comments, YDK contents, builder imports, historical profiles, filters, missing decks, API failure and mobile layout.

Generating payloads does not publish them. Publication must be explicitly requested, use the existing API and check existing slugs/signatures to avoid duplicates. Existing community posts are not rewritten. The optional local `--import SOURCE_PROJECT SIDE_REVIEW_DIRECTORY` operation validates release files and refreshes YDKs/aliases only; it preserves the reviewed English guides.
