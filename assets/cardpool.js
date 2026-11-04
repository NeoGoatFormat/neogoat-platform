(function () {
  "use strict";
  const core = window.NeoGoatCardPool;
  const $ = id => document.getElementById(id);
  const PAGE_SIZE = 36;
  const embedded = new URLSearchParams(location.search).get("embed") === "1";
  document.documentElement.classList.toggle("is-embedded", embedded);
  let config, metadata, entries = [], page = 1, loadSequence = 0, loaded = false;
  let parentOrigin = null, frameViewport = null, lastHeight = 0, resizeFrame = 0;
  const dataCache = new Map(), imageCache = new Map();
  const categoryInputs = [...document.querySelectorAll("#category-selection [data-category]")];
  const selectedCategories = () => categoryInputs.filter(input => input.checked).map(input => input.dataset.category);
  const filters = () => ({ categories: selectedCategories(), query: $("search-input").value, type: $("type-filter").value,
    subtype: $("subtype-filter").value, status: $("status-filter").value });

  // An iframe may be embedded elsewhere, but only our Blogger and same-origin
  // preview can exchange scroll/size messages. Never trust a URL query as origin.
  if (embedded && window.parent !== window) {
    try {
      const origin = new URL(document.referrer).origin;
      if (origin === "https://neogoatformat.blogspot.com" || origin === location.origin ||
          (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) && /^(localhost|127\.0\.0\.1)$/.test(location.hostname))) parentOrigin = origin;
    } catch (_) { /* Missing referrer leaves the scrollable fallback usable. */ }
  }
  function messageParent(message) {
    if (parentOrigin) window.parent.postMessage(message, parentOrigin);
  }
  function notifyHeight() {
    if (!parentOrigin || resizeFrame) return;
    resizeFrame = requestAnimationFrame(() => {
      resizeFrame = 0;
      // Body content, not the iframe viewport: shrinking pages must shrink too.
      const height = Math.ceil(document.body.getBoundingClientRect().height);
      if (height !== lastHeight) {
        lastHeight = height;
        messageParent({ type: "neogoat:resize", height });
      }
    });
  }
  function positionDialog() {
    if (!frameViewport) return;
    const dialog = $("card-dialog");
    dialog.style.setProperty("--dialog-top", (frameViewport.top + 12) + "px");
    dialog.style.setProperty("--dialog-max-height", Math.max(160, frameViewport.height - 24) + "px");
  }
  window.addEventListener("message", event => {
    if (!parentOrigin || event.origin !== parentOrigin || event.source !== window.parent) return;
    const data = event.data;
    if (!data || data.type !== "neogoat:viewport" || !Number.isFinite(data.top) || !Number.isFinite(data.height)) return;
    if (data.top < 0 || data.top > 30000 || data.height < 0 || data.height > 10000) return;
    frameViewport = { top: data.top, height: data.height };
    positionDialog();
  });
  if (parentOrigin) {
    new ResizeObserver(notifyHeight).observe(document.body);
    messageParent({ type: "neogoat:ready" });
  }

  async function fetchJSON(path) {
    const url = new URL(path, location.href);
    if (url.origin !== location.origin || !url.pathname.startsWith("/data/")) throw new Error("Invalid format data path.");
    const response = await fetch(url, { cache: "no-cache" });
    if (!response.ok) throw new Error("Could not load " + path + " (" + response.status + ").");
    return response.json();
  }
  function setBusy(busy) {
    $("loading-state").hidden = !busy;
    $("gallery").setAttribute("aria-busy", String(busy));
    for (const element of document.querySelectorAll("#category-selection input, #category-selection button, #search-input, #type-filter, #subtype-filter, #status-filter, #clear-filters")) element.disabled = busy || !loaded;
  }
  function showError(error) {
    loaded = false;
    entries = [];
    $("gallery").replaceChildren();
    $("pagination").hidden = true;
    $("empty-state").hidden = true;
    $("result-summary").textContent = "Card data could not be loaded.";
    $("load-error").hidden = false;
    let detail = $("load-error-detail");
    if (!detail) { detail = document.createElement("p"); detail.id = "load-error-detail"; $("load-error").prepend(detail); }
    detail.textContent = error.message;
    for (const el of document.querySelectorAll("[data-count]")) el.textContent = "—";
    notifyHeight();
  }
  async function loadFormat() {
    const sequence = ++loadSequence;
    loaded = false;
    setBusy(true);
    $("load-error").hidden = true;
    $("gallery").replaceChildren();
    $("pagination").hidden = true;
    $("empty-state").hidden = true;
    try {
      const format = config.formats.find(item => item.id === $("format-select").value);
      if (!format) throw new Error("The selected format is not configured.");
      let prepared = dataCache.get(format.id);
      if (!prepared) {
        const raw = await fetchJSON(format.cardsFile);
        prepared = core.prepareCards(raw, metadata);
        dataCache.set(format.id, prepared);
      }
      if (sequence !== loadSequence) return;
      entries = prepared;
      loaded = true;
      page = 1;
      updateSubtypes();
      render();
    } catch (error) { if (sequence === loadSequence) showError(error); }
    finally { if (sequence === loadSequence) { setBusy(false); notifyHeight(); } }
  }
  function updateSubtypes(preserveSelection = false) {
    const type = $("type-filter").value;
    const previous = $("subtype-filter").value;
    const values = [...new Set(core.selectCategories(entries, selectedCategories()).filter(entry => !type || entry.card.type === type).flatMap(entry => core.subtypes(entry.card)))].sort();
    // Category changes should not clear an active filter, even when that
    // subtype temporarily has no cards in the selected union.
    if (preserveSelection && previous && !values.includes(previous)) values.push(previous);
    values.sort();
    $("subtype-filter").replaceChildren(new Option("All subtypes", ""), ...values.map(value => new Option(value, value)));
    $("subtype-filter").value = values.includes(previous) ? previous : "";
  }
  function loadImage(img, entry, large, wrapper) {
    const key = entry.id + (large ? ":full" : ":thumb");
    const sources = [...new Set([imageCache.get(key), ...core.imageCandidates(entry.card.password, large)].filter(Boolean))];
    let index = 0;
    img.hidden = false;
    // A reused detail image must never show the previous card while loading.
    img.style.visibility = "hidden";
    img.alt = entry.card.name;
    img.referrerPolicy = "no-referrer";
    img.decoding = "async";
    img.loading = large ? "eager" : "lazy";
    img.width = 421;
    img.height = 614;
    if (wrapper) wrapper.classList.remove("image-missing");
    img.onload = () => { imageCache.set(key, sources[index]); img.style.visibility = "visible"; };
    img.onerror = () => {
      if (!img.isConnected) return;
      index++;
      if (index < sources.length) { img.src = sources[index]; return; }
      img.onerror = null;
      img.onload = null;
      img.hidden = true;
      if (wrapper) wrapper.classList.add("image-missing");
    };
    img.src = sources[0];
  }
  function statusText(card) {
    const state = core.STATUS[card.ban_status];
    return state.limit + " · " + state.label;
  }
  function tile(entry) {
    const li = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "card-tile";
    button.dataset.password = entry.card.password;
    button.setAttribute("aria-label", entry.card.name + ", " + statusText(entry.card) + (entry.card.ban_status === "forbidden" ? ", not playable" : "") + ". View card details.");
    const wrap = document.createElement("span");
    wrap.className = "image-wrap";
    const img = document.createElement("img");
    img.className = "card-art";
    const fallback = document.createElement("span");
    fallback.className = "image-fallback";
    fallback.textContent = "Image unavailable";
    wrap.append(img, fallback);
    const name = document.createElement("span");
    name.className = "card-name";
    name.textContent = entry.card.name;
    const badge = document.createElement("span");
    badge.className = "status-badge status-" + entry.card.ban_status;
    badge.textContent = statusText(entry.card) + (entry.card.ban_status === "forbidden" ? " · Not playable" : "");
    button.append(wrap, name, badge);
    button.addEventListener("click", () => openCard(entry));
    li.append(button);
    loadImage(img, entry, false, wrap);
    return li;
  }
  function render() {
    if (!loaded) return;
    const counts = core.categoryCounts(entries);
    for (const el of document.querySelectorAll("[data-count]")) el.textContent = counts[el.dataset.count].toLocaleString("en");
    const categories = selectedCategories();
    const selectedTotal = core.selectCategories(entries, categories).length;
    const allSelected = categories.length === Object.keys(core.CATEGORIES).length;
    const additionsSelected = categories.length === core.DEFAULT_CATEGORIES.length && core.DEFAULT_CATEGORIES.every(category => categories.includes(category));
    $("category-title").textContent = allSelected ? "Complete Card Pool" : additionsSelected ? "All Added Cards" :
      categories.length === 1 ? core.CATEGORIES[categories[0]].title : "Selected Card Pool";
    $("category-description").textContent = categories.length === 1 ? core.CATEGORIES[categories[0]].description :
      allSelected ? "The complete format, including classic Goat cards. Banlist status always applies." :
      additionsSelected ? "Explore the OCG, Structure Deck and Extra Pool additions beyond classic Goat Format." :
      "Combine categories to browse their unique cards together.";
    const matches = core.filterCards(entries, filters());
    const totalPages = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));
    page = Math.min(Math.max(page, 1), totalPages);
    const offset = (page - 1) * PAGE_SIZE;
    $("gallery").replaceChildren(...matches.slice(offset, offset + PAGE_SIZE).map(tile));
    $("empty-state").hidden = matches.length !== 0;
    $("empty-title").textContent = categories.length ? "No cards match these filters" : "Select at least one category";
    $("empty-description").textContent = categories.length ?
      "Try a different name or password, or clear the filters to browse this collection." :
      "Choose one or more card pool categories above to show cards.";
    $("pagination").hidden = matches.length === 0;
    $("previous-page").disabled = page === 1;
    $("next-page").disabled = page === totalPages;
    $("page-label").textContent = "Page " + page + " of " + totalPages;
    $("result-summary").textContent = selectedTotal.toLocaleString("en") + " unique cards selected" + (matches.length ?
      " · " + matches.length.toLocaleString("en") + " match · Showing " + (offset + 1) + "–" + Math.min(offset + PAGE_SIZE, matches.length) + " · A–Z" :
      categories.length ? " · 0 match these filters." : " · Select at least one category.");
    notifyHeight();
  }
  function openCard(entry) {
    const card = entry.card;
    const status = core.STATUS[card.ban_status];
    $("detail-name").textContent = card.name;
    $("detail-password").textContent = card.password;
    $("detail-type").textContent = [card.type, ...core.subtypes(card), card.type === "Monster" ? card.monsterType : null].filter(Boolean).join(" / ");
    $("detail-origin").textContent = entry.classificationNote ?
      card.pool + " · Classic Goat reprint (excluded from additions)" : card.pool;
    $("detail-status").textContent = status.label + (status.limit === 0 ? " · Not playable" : "");
    $("detail-status").className = "status-badge status-" + card.ban_status;
    $("detail-limit").textContent = status.limit + (status.limit === 1 ? " copy" : " copies") + (status.limit === 0 ? " — cannot be used in a deck" : " maximum, subject to shared-name deck rules");
    $("detail-text").textContent = card.text || "No card text is provided in this format file.";
    if ($("detail-stats")) $("detail-stats").textContent = card.type === "Monster" ?
      [card.attribute, card.level == null ? null : "Level " + card.level, card.atk == null ? null : "ATK " + card.atk, card.def == null ? null : "DEF " + card.def].filter(value => value != null).join(" · ") : "";
    const img = $("detail-image");
    const wrap = img.parentElement;
    if (!wrap.querySelector(".image-fallback")) {
      const fallback = document.createElement("span");
      fallback.className = "image-fallback";
      fallback.textContent = "Image unavailable. Card details are shown here.";
      wrap.append(fallback);
    }
    loadImage(img, entry, true, wrap);
    positionDialog();
    $("card-dialog").showModal();
    $("close-dialog").focus({ preventScroll: true });
  }
  function changePage(delta) {
    page += delta;
    render();
    if (parentOrigin) messageParent({ type: "neogoat:scroll-top" });
    else $("category-title").scrollIntoView({ block: "start" });
    $("category-title").focus({ preventScroll: true });
  }
  function changeCategories() {
    page = 1;
    updateSubtypes(true);
    render();
  }
  for (const input of categoryInputs) input.addEventListener("change", changeCategories);
  $("select-all-categories").addEventListener("click", () => {
    for (const input of categoryInputs) input.checked = true;
    changeCategories();
  });
  $("clear-categories").addEventListener("click", () => {
    for (const input of categoryInputs) input.checked = false;
    changeCategories();
  });
  $("type-filter").addEventListener("change", () => { page = 1; updateSubtypes(); render(); });
  for (const id of ["subtype-filter", "status-filter"]) $(id).addEventListener("change", () => { page = 1; render(); });
  $("search-input").addEventListener("input", () => { page = 1; render(); });
  $("clear-filters").addEventListener("click", () => {
    for (const id of ["search-input", "type-filter", "subtype-filter", "status-filter"]) $(id).value = "";
    page = 1;
    updateSubtypes();
    render();
  });
  $("previous-page").addEventListener("click", () => changePage(-1));
  $("next-page").addEventListener("click", () => changePage(1));
  $("format-select").addEventListener("change", loadFormat);
  $("close-dialog").addEventListener("click", () => $("card-dialog").close());
  $("card-dialog").addEventListener("click", event => {
    if (event.target !== $("card-dialog")) return;
    const rect = event.target.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) event.target.close();
  });
  async function start() {
    loaded = false;
    setBusy(true);
    $("load-error").hidden = true;
    try {
      config = await fetchJSON("data/cardpool-gallery.json");
      if (!Array.isArray(config.formats) || !config.formats.length || !config.formats.some(format => format.id === config.activeFormatId)) throw new Error("Invalid gallery format configuration.");
      metadata = await fetchJSON(config.classificationFile);
      $("format-select").replaceChildren(...config.formats.map(format => new Option(format.label, format.id)));
      $("format-select").value = config.activeFormatId;
      await loadFormat();
    } catch (error) { showError(error); setBusy(false); }
  }
  $("retry-load").addEventListener("click", () => { dataCache.clear(); start(); });
  start();
})();
