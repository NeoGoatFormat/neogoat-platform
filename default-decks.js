(function (root) {
  "use strict";
  let pending;
  const api = {
    async load() {
      if (!pending) pending = (async () => {
        const response = await fetch("/data/decks/neogoat-pro-oct-2026.json", { cache: "no-store" });
        if (!response.ok) throw new Error("No se pudieron cargar los mazos de NeoGoat Pro (" + response.status + ").");
        const data = await response.json();
        if (!Array.isArray(data.decks)) throw new Error("El catálogo de NeoGoat Pro no es válido.");
        return data.decks.slice().sort((a, b) => a.default_order - b.default_order);
      })().catch(error => { pending = null; throw error; });
      return pending;
    },
    merge(defaults, community) {
      const slugs = new Set(defaults.map(deck => deck.slug));
      return defaults.concat(community.filter(deck => !slugs.has(deck.slug)));
    },
    formatLabel(id) {
      const labels = { feb_2026: "FEBRUARY 2026", jun_2026: "JUNE 2026", aug_2026: "AUGUST 2026", oct_2026: "OCTOBER 2026" };
      return labels[id] || String(id || "NeoGoat").replace(/_/g, " ").toUpperCase();
    }
  };
  root.NeoGoatDefaults = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
