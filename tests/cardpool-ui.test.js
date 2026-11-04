/* DOM behavior checks. Install jsdom outside the checkout, then provide NODE_PATH.
   Example: npm --prefix ../qa-deps install jsdom --no-audit --no-fund
   PowerShell: $env:NODE_PATH=(Resolve-Path ../qa-deps/node_modules).Path; node tests/cardpool-ui.test.js
   This is a DOM simulation; native dialog layout and mobile scrolling need browser QA. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { JSDOM } = require("jsdom");
const root = path.resolve(__dirname, "..");
const read = name => fs.readFileSync(path.join(root, name), "utf8");
const readJSON = name => JSON.parse(read(name));
const cardPath = "data/formats/oct_2026/cards_oct_2026.json";
const october = readJSON(cardPath);
const core = require("../assets/cardpool-core.js");
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

async function until(predicate, label) {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (predicate()) return;
    await wait(5);
  }
  throw new Error("Timed out: " + label);
}

function setup(options = {}) {
  const dom = new JSDOM(read("cardpool.html"), {
    url: "https://neogoat-platform.vercel.app/cardpool.html" + (options.embedded ? "?embed=1" : ""),
    referrer: options.referrer || "https://neogoatformat.blogspot.com/p/cardpool.html",
    runScripts: "outside-only", pretendToBeVisual: true
  });
  const { window } = dom;
  const requests = [], messages = [], failures = new Map(Object.entries(options.failures || {}));
  const fixture = options.fixture || {};
  const parent = { postMessage: (data, origin) => messages.push({ data, origin }) };
  if (options.embedded) Object.defineProperty(window, "parent", { value: parent });
  window.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  window.HTMLDialogElement.prototype.close = function () { this.open = false; };
  window.HTMLElement.prototype.scrollIntoView = function () { this.dataset.scrolled = "true"; };
  window.document.body.getBoundingClientRect = () => ({ height: 2400 });
  window.ResizeObserver = class { constructor(callback) { this.callback = callback; } observe() { this.callback(); } disconnect() {} };
  window.fetch = async (url, settings) => {
    const relative = new URL(url).pathname.slice(1);
    requests.push({ path: relative, settings });
    if ((failures.get(relative) || 0) > 0) {
      failures.set(relative, failures.get(relative) - 1);
      return { ok: false, status: 503 };
    }
    const value = Object.hasOwn(fixture, relative) ? fixture[relative] : readJSON(relative);
    return { ok: true, json: async () => JSON.parse(JSON.stringify(value)) };
  };
  window.eval(read("assets/cardpool-core.js"));
  window.eval(read("assets/cardpool.js"));
  const $ = id => window.document.getElementById(id);
  const select = (id, value) => { $(id).value = value; $(id).dispatchEvent(new window.Event("change")); };
  const query = value => { $("search-input").value = value; $("search-input").dispatchEvent(new window.Event("input")); };
  const category = value => window.document.querySelector('[data-category="' + value + '"]').click();
  const tiles = () => [...window.document.querySelectorAll("#gallery .card-tile")];
  const ready = () => until(() => $("loading-state").hidden && $("gallery").getAttribute("aria-busy") === "false", "card data settles");
  const sendParent = (data, origin = "https://neogoatformat.blogspot.com", source = parent) => {
    const event = new window.Event("message");
    Object.assign(event, { data, origin, source });
    window.dispatchEvent(event);
  };
  return { dom, window, $, select, query, category, tiles, ready, requests, messages, sendParent };
}

async function main() {
  const app = setup();
  try {
    await app.ready();
    assert.equal(app.$("search-input").value, "");
    assert.equal(app.$("category-title").textContent, "All Added Cards");
    assert.equal(app.tiles().length, 36, "Initial browsing needs no query and renders one bounded page");
    const expected = { added: "531", ocg: "390", structure: "38", extra: "103", complete: "2,229" };
    for (const [category, count] of Object.entries(expected)) {
      assert.equal(app.window.document.querySelector('[data-count="' + category + '"]').textContent, count);
    }
    assert.match(app.$("result-summary").textContent, /531 of 531 cards/);
    assert(app.tiles().every(tile => tile.querySelector("img").loading === "lazy"));
    assert(app.requests.every(request => request.settings.cache === "no-cache"));
    const firstPage = app.tiles().map(tile => tile.dataset.password);
    app.$("next-page").click();
    assert.match(app.$("page-label").textContent, /^Page 2 of /);
    assert(!app.tiles().some(tile => firstPage.includes(tile.dataset.password)), "Pages do not overlap");
    app.$("previous-page").click();
    assert.deepEqual(app.tiles().map(tile => tile.dataset.password), firstPage);

    app.category("extra");
    app.select("type-filter", "Spell");
    app.select("subtype-filter", "Continuous");
    app.select("status-filter", "semi-limited");
    app.query("Future Fusion");
    assert.equal(app.tiles().length, 1, "Category, type, subtype, status and query combine");
    assert.equal(app.tiles()[0].dataset.password, "77565204");
    app.tiles()[0].click();
    const fusion = october.find(card => card.password === "77565204");
    assert.equal(app.$("card-dialog").open, true);
    assert.equal(app.$("detail-name").textContent, fusion.name);
    assert.equal(app.$("detail-password").textContent, fusion.password);
    assert.equal(app.$("detail-text").textContent, fusion.text);
    assert.equal(app.$("detail-origin").textContent, fusion.pool);
    assert.equal(app.$("detail-status").textContent, "Semi-Limited");
    assert.match(app.$("detail-limit").textContent, /^2 copies/);
    assert.equal(app.$("detail-image").loading, "eager");
    assert(app.$("detail-image").src.includes("%2Fcards%2F77565204.jpg"));
    app.$("close-dialog").click();
    assert.equal(app.$("card-dialog").open, false);

    app.$("clear-filters").click();
    assert.equal(app.tiles().length, 36);
    assert.equal(app.$("category-title").textContent, "Extra Pool", "Clear retains chosen category");
    app.select("status-filter", "limited");
    assert.equal(app.tiles().length, 5);
    app.select("status-filter", "semi-limited");
    assert.equal(app.tiles().length, 9);
    app.$("clear-filters").click();
    app.query("99999999");
    assert.equal(app.tiles().length, 0);
    assert.equal(app.$("empty-state").hidden, false);
    assert.equal(app.$("pagination").hidden, true);

    app.$("clear-filters").click();
    app.category("complete");
    app.select("status-filter", "forbidden");
    assert.equal(app.tiles().length, 33);
    assert(app.tiles().every(tile => tile.textContent.includes("0 · Forbidden · Not playable")));
    app.tiles()[0].click();
    assert.match(app.$("detail-limit").textContent, /^0 copies — cannot be used/);
    app.$("close-dialog").click();
    app.$("clear-filters").click();
    app.query("28649820");
    assert.equal(app.tiles().length, 1, "Classic reprint remains in complete pool");
    app.tiles()[0].click();
    assert.match(app.$("detail-origin").textContent, /Classic Goat reprint/);
    app.$("close-dialog").click();
    app.category("added");
    assert.equal(app.tiles().length, 0, "Classic reprint is excluded from additions");

    app.$("clear-filters").click();
    const tile = app.tiles()[0], img = tile.querySelector("img");
    const sources = core.imageCandidates(tile.dataset.password);
    for (let index = 0; index < sources.length; index++) {
      assert.equal(img.src, sources[index], "Image alternatives advance in order");
      img.dispatchEvent(new app.window.Event("error"));
    }
    assert.equal(img.hidden, true);
    assert.equal(img.onerror, null, "Exhausted fallbacks stop retrying");
    assert(tile.querySelector(".image-wrap").classList.contains("image-missing"));
    assert.equal(tile.querySelector(".image-fallback").textContent, "Image unavailable");
    app.select("format-select", "oct_2026");
    await app.ready();
    assert.equal(app.requests.filter(request => request.path === cardPath).length, 1, "Cached format does not refetch per filter or reselection");
  } finally { app.dom.window.close(); }

  // Untrusted JSON remains text, both in tiles and the enlarged view.
  const injected = { ...october.find(card => card.pool === "Extra Card Pool"),
    name: '<img src=x onerror="window.injected=true">', text: '<script>window.injected=true</script>' };
  const unsafe = setup({ fixture: { [cardPath]: [injected] } });
  try {
    await unsafe.ready();
    assert.equal(unsafe.tiles().length, 1);
    assert.equal(unsafe.tiles()[0].querySelector(".card-name").textContent, injected.name);
    assert.equal(unsafe.tiles()[0].querySelector(".card-name").children.length, 0);
    unsafe.tiles()[0].click();
    assert.equal(unsafe.$("detail-name").textContent, injected.name);
    assert.equal(unsafe.$("detail-text").textContent, injected.text);
    assert.equal(unsafe.$("detail-text").children.length, 0);
    assert.equal(unsafe.window.injected, undefined);
  } finally { unsafe.dom.window.close(); }

  // A failed format load clears the previous cards; retry returns to active format.
  const config = readJSON("data/cardpool-gallery.json");
  const secondPath = "data/formats/unavailable/cards.json";
  config.formats.push({ id: "unavailable", label: "Unavailable test fixture", cardsFile: secondPath });
  const failed = setup({ fixture: { "data/cardpool-gallery.json": config }, failures: { [secondPath]: 1 } });
  try {
    await failed.ready();
    assert.equal(failed.tiles().length, 36);
    failed.select("format-select", "unavailable");
    await failed.ready();
    assert.equal(failed.tiles().length, 0, "Failed replacement does not leave stale legal cards");
    assert.equal(failed.$("load-error").hidden, false);
    assert.equal(failed.$("empty-state").hidden, true);
    assert.equal(failed.$("pagination").hidden, true);
    assert.match(failed.$("result-summary").textContent, /could not be loaded/);
    failed.$("clear-filters").click();
    assert.equal(failed.$("empty-state").hidden, true, "Error is not replaced by a valid empty result");
    assert.match(failed.$("result-summary").textContent, /could not be loaded/);
    failed.$("retry-load").click();
    await failed.ready();
    assert.equal(failed.$("load-error").hidden, true);
    assert.equal(failed.tiles().length, 36);
    assert.equal(failed.$("format-select").value, "oct_2026");
  } finally { failed.dom.window.close(); }

  const initialFailure = setup({ failures: { [cardPath]: 1 } });
  try {
    await initialFailure.ready();
    assert.equal(initialFailure.tiles().length, 0);
    assert.equal(initialFailure.$("load-error").hidden, false);
    initialFailure.$("retry-load").click();
    await initialFailure.ready();
    assert.equal(initialFailure.tiles().length, 36);
  } finally { initialFailure.dom.window.close(); }

  const embedded = setup({ embedded: true });
  try {
    await embedded.ready();
    await until(() => embedded.messages.some(message => message.data.type === "neogoat:resize"), "iframe content height");
    assert(embedded.messages.every(message => message.origin === "https://neogoatformat.blogspot.com"));
    assert(embedded.messages.some(message => message.data.type === "neogoat:ready"));
    assert.equal(embedded.messages.find(message => message.data.type === "neogoat:resize").data.height, 2400);
    const viewport = { type: "neogoat:viewport", top: 600, height: 700 };
    embedded.sendParent(viewport, "https://attacker.example");
    assert.equal(embedded.$("card-dialog").style.getPropertyValue("--dialog-top"), "");
    embedded.sendParent(viewport, undefined, {});
    assert.equal(embedded.$("card-dialog").style.getPropertyValue("--dialog-top"), "");
    embedded.sendParent({ ...viewport, top: Infinity });
    assert.equal(embedded.$("card-dialog").style.getPropertyValue("--dialog-top"), "");
    embedded.sendParent(viewport);
    assert.equal(embedded.$("card-dialog").style.getPropertyValue("--dialog-top"), "612px");
    assert.equal(embedded.$("card-dialog").style.getPropertyValue("--dialog-max-height"), "676px");
    embedded.$("next-page").click();
    assert(embedded.messages.some(message => message.data.type === "neogoat:scroll-top"));
  } finally { embedded.dom.window.close(); }
  console.log("CARDPOOL_UI_TEST PASS: initial browsing, counts, combined filters, pagination, dialog, safe text, image fallback, loading/retry, cache and iframe protocol.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
