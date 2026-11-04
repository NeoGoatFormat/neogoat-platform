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
    classic: { title: "Goat Pool", description: "The classic Goat card pool, including its documented reprints." },
    ocg: { title: "OCG Exclusives", description: "Historical OCG pool additions, including cards that received a later TCG printing." },
    structure: { title: "Structure Deck Additions", description: "New cards from the allowed Structure Decks. Classic Goat reprints are excluded." },
    extra: { title: "Extra Pool", description: "The active Extra Pool, with every banlist status together in one gallery." }
  });
  const DEFAULT_CATEGORIES = Object.freeze(["ocg", "structure", "extra"]);
  const collator = new Intl.Collator("en", { sensitivity: "base", numeric: true });
  function identity(value) {
    const raw = String(value == null ? "" : value).trim();
    if (!/^\d{1,8}$/.test(raw) || Number(raw) === 0) throw new Error("Invalid card password in the format data.");
    return String(Number(raw));
  }
  function comparableCard(card, id) {
    const normalized = { ...card, password: id, pool: null };
    return JSON.stringify(Object.fromEntries(Object.keys(normalized).sort().map(key => [key, normalized[key]])));
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
      const override = overrides.get(id);
      if (override && (override.name !== card.name || !override.source || !override.reason)) {
        throw new Error("Classification evidence does not match card " + id);
      }
      const category = override ? "classic" : POOLS[card.pool];
      if (unique.has(id)) {
        const existing = unique.get(id);
        // One password can belong to several pools. All card details and limits
        // must still agree; only source pool and password padding may differ.
        if (comparableCard(existing.card, id) !== comparableCard(card, id)) {
          throw new Error("Conflicting duplicate password in the format data: " + id);
        }
        if (!existing.categories.includes(category)) existing.categories.push(category);
        continue;
      }
      unique.set(id, { id, card, category, categories: [category], classificationNote: override || null });
    }
    return [...unique.values()].sort((a, b) => collator.compare(a.card.name, b.card.name) || Number(a.id) - Number(b.id));
  }
  function inCategory(entry, category) {
    return (entry.categories || [entry.category]).includes(category);
  }
  function selectCategories(entries, categories = DEFAULT_CATEGORIES) {
    const selected = [...new Set(categories)];
    const unique = new Map();
    for (const entry of entries) {
      if (selected.some(category => inCategory(entry, category))) {
        const id = identity(entry.card.password);
        if (!unique.has(id)) unique.set(id, entry);
      }
    }
    return [...unique.values()];
  }
  function categoryCounts(entries) {
    return Object.fromEntries(Object.keys(CATEGORIES).map(category => [category, selectCategories(entries, [category]).length]));
  }
  function subtypes(card) {
    return [...new Set([card.subType, card.type === "Monster" ? card.class : null].filter(Boolean))];
  }
  function filterCards(entries, filters = {}) {
    const query = String(filters.query || "").trim().toLocaleLowerCase("en");
    return selectCategories(entries, filters.categories).filter(entry => {
      const card = entry.card;
      return (!filters.type || card.type === filters.type) &&
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
  return { POOLS, STATUS, CATEGORIES, DEFAULT_CATEGORIES, identity, prepareCards, inCategory, selectCategories, categoryCounts, subtypes, filterCards, imageCandidates };
});
