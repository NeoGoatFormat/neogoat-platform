# NeoGoat Platform

Official online Deck Builder and future Manual Duel System for the NeoGoat format.

---

## About NeoGoat

NeoGoat is a curated evolution of classic Goat Format.

It maintains the strategic depth of the pre-Cybernetic Revolution era while introducing:
- A controlled rotating Extra Pool
- Bi-monthly banlists
- A modernized competitive environment
- Community-driven experimentation

NeoGoat is not a nostalgia clone.
It is a living sandbox format.

---

## Current Format

**Active Format:** [NeoGoat October 2026](data/formats/oct_2026/README.md) (selected by `data/config.json`).

October includes the published banlist, its source, exact changes and reproducible validation. Earlier format files remain available for historical deck profiles.

Previous formats before February 2026 are deprecated.

Every two months:
- A new banlist is released
- Extra Pool cards may rotate in or out
- Format balance adjustments are applied

---

## NeoGoat Pro default profiles

[Browse the 20 beta.60 default decks](https://neogoat-platform.vercel.app/decks.html?collection=defaults), each with its original YDK, a Spanish play guide, card-by-card Side Deck guidance, and concrete side-in/side-out plans for October 2026. Profiles open directly in the builder and remain available independently of the community database. Community submissions and earlier formats remain available through the library filters.

The [profile sources and validation instructions](data/decks/README.md) document the exact release, hashes, and adaptations to the final lists. These profiles describe the shipped decks; they are not a competitive tier list.

## Platform Architecture

This platform is designed to be:

- Fully static (served via Vercel)
- JSON-driven cardpool
- Format-aware
- Limit-validating

### Data Structure

