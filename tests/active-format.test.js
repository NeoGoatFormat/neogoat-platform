const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "deck.html"), "utf8");
const readJSON = file => JSON.parse(fs.readFileSync(path.join(root, file.replace(/^\//, "")), "utf8"));
function extract(name) {
  const match = new RegExp("(?:async )?function " + name + "\\(").exec(html);
  assert(match, name);
  const start = match.index, opening = html.indexOf("{", start);
  let depth = 1, end = opening + 1;
  for (; depth && end < html.length; end++) {
    if (html[end] === "{") depth++;
    if (html[end] === "}") depth--;
  }
  assert.equal(depth, 0);
  return html.slice(start, end);
}
const label = {}, requests = [];
const context = vm.createContext({
  cardList: [], cardByName: {}, currentFormatId: "", console,
  $: () => label,
  fetch: async (url, options) => {
    requests.push({ url, options });
    return { ok: true, json: async () => readJSON(url) };
  }
});
for (const name of ["normName", "normalizePool", "fetchJsonFirst", "formatLabel", "loadCardData", "cardDataByName", "cardPassword", "makeYDK"]) {
  vm.runInContext(extract(name), context);
}
(async () => {
  await context.loadCardData("dec_2026");
  assert.equal(label.textContent, "CURRENT FORMAT: DECEMBER 2026");
  assert.equal(context.cardList.length, 2231);
  assert.equal(context.cardDataByName("Graceful Charity").ban_status, "limited");
  assert.equal(context.cardDataByName("Pot of Greed").ban_status, "forbidden");
  assert(context.cardPassword("Valhalla, Hall of the Fallen"));
  assert.equal(context.cardDataByName("Elemental HERO Prisma"), null);
  assert.equal(context.formatLabel("dec_2026"), "DECEMBER 2026");
  await context.loadCardData("oct_2026");
  assert.equal(label.textContent, "CURRENT FORMAT: DECEMBER 2026");
  assert.equal(context.cardList.length, 2229);
  assert.equal(context.cardDataByName("Pot of Greed").ban_status, "limited");
  assert.equal(context.cardDataByName("Graceful Charity").ban_status, "forbidden");
  assert.equal(context.cardDataByName("Valhalla, Hall of the Fallen"), null);
  const historical = { main_deck: [{ name: "Elemental HERO Prisma", qty: 2 }], extra_deck: [], side_deck: [] };
  assert.equal(context.makeYDK(historical), "#main\n89312388\n89312388\n#extra\n!side\n");
  assert.equal(context.formatLabel("oct_2026"), "OCTOBER 2026");
  await context.loadCardData("feb_2026");
  assert(context.cardPassword("Miracle Fertilizer"), "February retains removed cards");
  assert(requests.every(request => request.options.cache === "no-store"), "Viewer revalidates config and historical data");
  const gallery = readJSON("data/cardpool-gallery.json");
  assert.equal(gallery.activeFormatId, "dec_2026");
  assert.equal(readJSON(gallery.formats.find(format => format.id === gallery.activeFormatId).cardsFile).length, 2231);
  assert(gallery.formats.some(format => format.id === "oct_2026"));
  console.log("ACTIVE_FORMAT PASS: December limits and gallery, October metadata/export, February historical cards");
})().catch(error => { console.error(error); process.exitCode = 1; });
