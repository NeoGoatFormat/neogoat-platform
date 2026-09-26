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

[Browse Deck Library](https://neogoat-platform.vercel.app/decks.html) for the 20 beta.60 default decks, published as ordinary deck posts alongside existing community submissions. Each post includes its English play guide and Side Deck guide in the existing description field. There is no separate collection selector or special guide interface. The usual Read More, comments, downloads and Open in Builder actions apply.

The [profile sources and validation instructions](data/decks/README.md) document the exact release, hashes, and adaptations to the final lists. These profiles describe the shipped decks; they are not a competitive tier list.

Public website UI and official deck descriptions are written in English for an international audience. Preserve the existing page design unless a redesign is explicitly requested. Community-authored content keeps its original language.

## Platform Architecture

This platform is designed to be:

- Fully static (served via Vercel)
- JSON-driven cardpool
- Format-aware
- Limit-validating

### Data Structure

