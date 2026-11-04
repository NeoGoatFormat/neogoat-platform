const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const core = require("../assets/cardpool-core.js");
const readJSON = file => JSON.parse(fs.readFileSync(path.join(__dirname, "..", file), "utf8"));
const raw = readJSON("data/formats/oct_2026/cards_oct_2026.json");
const metadata = readJSON("data/cardpool-classification.json");
const original = JSON.stringify(raw);
const entries = core.prepareCards(raw, metadata);
const byId = new Map(entries.map(entry => [entry.id, entry]));
const counts = core.categoryCounts(entries);

// Frozen October expectations are regression fixtures, never application totals.
assert.deepEqual(counts, { added: 531, ocg: 390, structure: 38, extra: 103, complete: 2229 });
assert.equal(core.filterCards(entries).length, counts.added, "The empty search immediately shows All Added Cards");
assert.equal(new Set(entries.map(entry => entry.id)).size, entries.length);
assert.equal(new Set(core.filterCards(entries).map(entry => entry.id)).size, counts.added);
assert.deepEqual([...new Set(raw.map(card => card.pool))].sort(), Object.keys(core.POOLS).sort());
assert.equal(JSON.stringify(raw), original, "Preparing the gallery must not mutate the source JSON");
for (const entry of entries) {
  assert.strictEqual(entry.card, raw.find(card => core.identity(card.password) === entry.id), "Details preserve the original source card object");
}

// Proven classic reprints remain in Complete, retaining their original pool label.
assert.deepEqual(metadata.classicOverrides.map(item => item.password).sort(), ["28649820", "48642904"]);
for (const [id, name, pool] of [
  ["28649820", "Embodiment of Apophis", "OCG Goat Cardpool"],
  ["48642904", "Mesmeric Control", "Added Structure Decks"]
]) {
  const entry = byId.get(id);
  assert.equal(entry.card.name, name);
  assert.equal(entry.card.pool, pool);
  assert.equal(entry.category, "classic");
  assert.equal(entry.classificationNote.source, "https://www.duelingbook.com/goat-format");
  assert(!core.filterCards(entries, { category: "added" }).includes(entry));
  assert(core.filterCards(entries, { category: "complete" }).includes(entry));
}
assert.equal(entries.filter(entry => entry.category === "classic").length, 1698);
assert.equal(core.filterCards(entries, { category: "ocg" }).filter(entry => entry.card.printedinTCG === "Yes").length, 240,
  "Historical OCG additions with later TCG printings must not disappear");
assert.equal(core.filterCards(entries, { category: "ocg" }).filter(entry => entry.card.printedinTCG === "No").length, 150);

const extra = core.filterCards(entries, { category: "extra" });
const statusCounts = list => Object.fromEntries(Object.keys(core.STATUS).map(status => [status, list.filter(entry => entry.card.ban_status === status).length]));
assert.deepEqual(statusCounts(extra), { forbidden: 0, limited: 5, "semi-limited": 9, unlimited: 89 });
assert.deepEqual(statusCounts(entries), { forbidden: 33, limited: 49, "semi-limited": 25, unlimited: 2122 });
assert.equal(core.filterCards(entries, { category: "added", status: "forbidden" }).length, 1);
assert.deepEqual(Object.fromEntries(Object.entries(core.STATUS).map(([status, value]) => [status, value.limit])),
  { forbidden: 0, limited: 1, "semi-limited": 2, unlimited: 3 });
for (const [id, status] of [
  ["52467217", "semi-limited"], ["77565204", "semi-limited"], ["89312388", "limited"],
  ["82099401", "unlimited"], ["20586572", "unlimited"], ["3019642", "unlimited"], ["28601770", "unlimited"]
]) {
  assert(extra.includes(byId.get(id)), `${id} must share the same Extra Pool gallery regardless of status`);
  assert.equal(byId.get(id).card.ban_status, status);
}
for (const id of ["88369727", "44887817", "3659803", "63223467"]) assert(!byId.has(id), `Removed October card ${id} must be absent`);
for (const name of ["Foolish Return", "Miracle Fertilizer", "Overload Fusion", "Rai-Mei"]) {
  assert.equal(core.filterCards(entries, { category: "complete", query: name }).length, 0);
}

// All filters compose; subtype checks include Monster class (Flip, Spirit, etc.).
const futureFusion = core.filterCards(entries, { category: "extra", query: "future", type: "Spell", subtype: "Continuous", status: "semi-limited" });
assert.deepEqual(futureFusion.map(entry => entry.id), ["77565204"]);
assert.equal(core.filterCards(entries, { category: "ocg", query: "Future Fusion" }).length, 0);
assert.deepEqual(core.filterCards(entries, { category: "extra", type: "Monster", subtype: "Flip", query: "Crystal Seer" }).map(entry => entry.id), ["82099401"]);
assert.equal(core.filterCards(entries, { category: "extra", type: "Trap", subtype: "Flip" }).length, 0);
assert.deepEqual(core.filterCards(entries, { category: "extra", query: " 03019642 " }).map(entry => entry.id), ["3019642"]);
assert.deepEqual(core.filterCards(entries, { category: "extra", query: "3019642" }).map(entry => entry.id), ["3019642"]);
assert.deepEqual(core.filterCards(entries, { category: "extra", query: "fUtUrE fUsIoN" }).map(entry => entry.id), ["77565204"]);

// Duplicate imports cannot inflate counts or silently choose a conflicting limit.
const sample = raw.find(card => card.password === "3019642");
const duplicates = core.prepareCards([sample, { ...sample }, { ...sample, password: "03019642" }], metadata);
assert.equal(duplicates.length, 1);
assert.equal(duplicates[0].card.password, sample.password, "Canonical identity must not rewrite the printed source password");
assert.throws(() => core.prepareCards([sample, { ...sample, ban_status: "forbidden" }], metadata), /Conflicting duplicate/);
assert.throws(() => core.prepareCards([{ ...sample, pool: "Future unreviewed pool" }], metadata), /Unrecognized/);
assert.throws(() => core.prepareCards([{ ...sample, pool: "toString" }], metadata), /Unrecognized/);
assert.throws(() => core.prepareCards([{ ...sample, ban_status: "unknown" }], metadata), /Unrecognized/);
assert.throws(() => core.prepareCards(raw, null), /Classification metadata/);
assert.throws(() => core.prepareCards([{ ...byId.get("48642904").card, name: "Wrong identity" }], metadata), /Classification evidence/);
assert.throws(() => core.identity("<script>"), /Invalid card password/);

// Only validated numeric IDs enter URLs; thumbnail and full-size fallbacks remain.
const small = core.imageCandidates("03019642");
const large = core.imageCandidates("03019642", true);
assert(small[0].includes(encodeURIComponent("cards_small/3019642.jpg")));
assert(large[0].includes(encodeURIComponent("cards/3019642.jpg")));
assert(small.some(url => url === "https://images.ygoprodeck.com/images/cards_small/3019642.jpg"));
assert(small.some(url => url === "https://images.ygoprodeck.com/images/cards_small/03019642.jpg"));
assert.equal(new Set(small).size, small.length);
assert.throws(() => core.imageCandidates("../bad"), /Invalid card password/);
console.log("CARDPOOL_DATA PASS", JSON.stringify(counts));
