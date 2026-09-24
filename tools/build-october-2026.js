// Deterministic, offline generation from the frozen August pool and reviewed delta.
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const directory = path.join(root, "data/formats/oct_2026");
const changes = JSON.parse(fs.readFileSync(path.join(directory, "changes.json"), "utf8"));
// Git's Windows checkout can use CRLF; pin the original LF Git blob everywhere.
const base = fs.readFileSync(path.join(root, changes.base.file), "utf8").replace(/\r\n/g, "\n");
assert.equal(crypto.createHash("sha256").update(base).digest("hex"), changes.base.sha256,
  "The frozen August pool changed; review the source before regenerating October.");
const cards = JSON.parse(base);
const byId = new Map(cards.map(card => [card.password, card]));
assert.equal(byId.size, cards.length, "Duplicate IDs in the base pool");
const touched = new Set();
function claim(id) {
  assert(!touched.has(id), `Duplicate delta for ${id}`);
  touched.add(id);
}
function existing(change) {
  claim(change.password);
  const card = byId.get(change.password);
  assert(card, `Missing base card ${change.password}`);
  assert.equal(card.name, change.name);
  assert.equal(card.ban_status, change.from, `Unexpected August limit for ${card.name}`);
  return card;
}
for (const change of changes.statusChanges) existing(change).ban_status = change.to;
for (const change of changes.removals) {
  existing(change);
  byId.delete(change.password);
}
for (const card of changes.additions) {
  claim(card.password);
  assert(!byId.has(card.password), `New card already exists: ${card.name}`);
  byId.set(card.password, card);
}
// Preserve inherited order and all metadata; append the six new entries.
const output = JSON.stringify([...byId.values()], null, 2) + "\n";
const target = path.join(directory, changes.rulesFile);
const args = process.argv.slice(2);
assert(args.length === 0 || (args.length === 1 && args[0] === "--check"),
  "Usage: node tools/build-october-2026.js [--check]");
if (args.includes("--check")) {
  assert.equal(fs.readFileSync(target, "utf8").replace(/\r\n/g, "\n"), output, "October data needs regeneration");
  console.log("OCTOBER_GENERATION_CHECK PASS");
} else {
  fs.writeFileSync(target, output);
  console.log(`Generated ${changes.rulesFile}: ${byId.size} cards`);
}
