/* Shared pure gallery logic. No card metadata or banlist is rewritten here. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.NeoGoatCardPool = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const POOLS = Object.freeze({
    "Normal Goat Cardpool": "classic",
    "OCG Goat Cardpool": "ocg",
    "Added Structure Decks": "structure",
    "Extra Card Pool": "extra"
  });
  const STATUS = Object.freeze({
    forbidden: { label: "Forbidden", limit: 0 },
    limited: { label: "Limited", limit: 1 },
    "semi-limited": { label: "Semi-Limited", limit: 2 },
    unlimited: { label: "Unlimited", limit: 3 }
  });
  const CATEGORIES = Object.freeze({
    added: { title: "All Added Cards", description: "Explore the OCG, Structure Deck and Extra Pool additions beyond classic Goat Format." },
    ocg: { title: "OCG Exclusives", description: "Historical OCG pool additions, including cards that received a later TCG printing." },
    structure: { title: "Structure Deck Additions", description: "New cards from the allowed Structure Decks. Classic Goat reprints are excluded." },
    extra: { title: "Extra Pool", description: "The active Extra Pool, with every banlist status together in one gallery." },
    complete: { title: "Complete Card Pool", description: "The complete format, including classic Goat cards. Forbidden cards are visible and cannot be played." }
  });
  const collator = new Intl.Collator("en", { sensitivity: "base", numeric: true });
  function identity(value) {
    const raw = String(value == null ? "" : value).trim();
    if (!/^\d{1,8}$/.test(raw) || Number(raw) === 0) throw new Error("Invalid card password in the format data.");
    return String(Number(raw));
  }
  function prepareCards(rows, metadata) {
    if (!Array.isArray(rows)) throw new Error("The format file must contain a card array.");
    if (!metadata || metadata.schemaVersion !== 1 || !Array.isArray(metadata.classicOverrides)) {
      throw new Error("Classification metadata is missing or unsupported.");
    }
    const overrides = new Map(metadata.classicOverrides.map(item => [identity(item.password), item]));
    const unique = new Map();
    for (const card of rows) {
      const id = identity(card.password);
      if (!card.name || !Object.hasOwn(POOLS, card.pool) || !Object.hasOwn(STATUS, card.ban_status) || !["Monster", "Spell", "Trap"].includes(card.type)) {
        throw new Error("Unrecognized name, pool, type or banlist status. Review the format data before displaying this version.");
      }
      if (unique.has(id)) {
        if (JSON.stringify({ ...unique.get(id).card, password: id }) !== JSON.stringify({ ...card, password: id })) {
          throw new Error("Conflicting duplicate password in the format data: " + id);
        }
        continue;
      }
      const override = overrides.get(id);
      if (override && (override.name !== card.name || !override.source || !override.reason)) {
        throw new Error("Classification evidence does not match card " + id);
      }
      unique.set(id, { id, card, category: override ? "classic" : POOLS[card.pool], classificationNote: override || null });
    }
    return [...unique.values()].sort((a, b) => collator.compare(a.card.name, b.card.name) || Number(a.id) - Number(b.id));
  }
  function inCategory(entry, category) {
    return category === "complete" || (category === "added" ? entry.category !== "classic" : entry.category === category);
  }
  function categoryCounts(entries) {
    return Object.fromEntries(Object.keys(CATEGORIES).map(category => [category, entries.filter(entry => inCategory(entry, category)).length]));
  }
  function subtypes(card) {
    return [...new Set([card.subType, card.type === "Monster" ? card.class : null].filter(Boolean))];
  }
  function filterCards(entries, filters = {}) {
    const query = String(filters.query || "").trim().toLocaleLowerCase("en");
    return entries.filter(entry => {
      const card = entry.card;
      return inCategory(entry, filters.category || "added") &&
        (!filters.type || card.type === filters.type) &&
        (!filters.subtype || subtypes(card).includes(filters.subtype)) &&
        (!filters.status || card.ban_status === filters.status) &&
        (!query || card.name.toLocaleLowerCase("en").includes(query) || String(card.password).includes(query) || entry.id.padStart(8, "0").includes(query));
    });
  }
  function imageCandidates(password, large = false) {
    // Same cache, padded/unpadded IDs and direct fallbacks as Blogger Card Search.
    // Numeric first avoids failed zero-padded URLs; thumbnails stay small.
    const id = identity(password);
    const ids = [...new Set([id, id.padStart(8, "0")])];
    const folders = large ? ["cards", "cards_small"] : ["cards_small", "cards"];
    const direct = ids.flatMap(value => folders.map(folder => "https://images.ygoprodeck.com/images/" + folder + "/" + value + ".jpg"));
    const dimensions = large ? "&w=421&h=614" : "&w=220&h=321";
    return [...direct.map(url => "https://wsrv.nl/?url=" + encodeURIComponent(url) + dimensions + "&fit=contain&output=webp&q=88"), ...direct];
  }
  return { POOLS, STATUS, CATEGORIES, identity, prepareCards, inCategory, categoryCounts, subtypes, filterCards, imageCandidates };
});
