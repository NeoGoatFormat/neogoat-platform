const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const vm = require("node:vm");
const { execFileSync } = require("node:child_process");
const root = path.resolve(__dirname, "..");
const read = name => fs.readFileSync(path.join(root, name), "utf8");
const json = name => JSON.parse(read(name));
const augustPath = "data/formats/aug_2026/cards_aug_2026.json";
const august = json(augustPath);
const october = json("data/formats/oct_2026/cards_oct_2026.json");
const before = new Map(august.map(card => [card.password, card]));
const after = new Map(october.map(card => [card.password, card]));
assert.equal(crypto.createHash("sha256").update(read(augustPath).replace(/\r\n/g, "\n")).digest("hex"),
  "f88c486ea36ee3fdfcf7c39055611a9413c1f454d939a405aee3d3e3a6882c25");
assert.equal(august.length, 2227);
assert.equal(october.length, 2229);
assert.equal(after.size, october.length, "IDs must be unique");
assert.equal(new Set(october.map(card => Number(card.password))).size, october.length,
  "Padded and unpadded passwords must not create duplicate identities");

// Independent expectations transcribed from the published October banlist.
const expectedChanges = {
  "77044671": "forbidden", "63519819": "forbidden",
  "72892473": "limited", "89312388": "limited", "87910978": "limited", "16226786": "limited",
  "26205777": "semi-limited", "31786629": "semi-limited", "68005187": "semi-limited",
  "51452091": "semi-limited", "911883": "semi-limited", "66386380": "semi-limited",
  "53094821": "semi-limited", "35539880": "semi-limited",
  "57281778": "unlimited", "25366484": "unlimited", "37576645": "unlimited"
};
const removed = ["88369727", "44887817", "3659803", "63223467"];
const added = {
  "52467217": ["Gozuki", "semi-limited", 4, 1700, 800],
  "77565204": ["Future Fusion", "semi-limited", null, null, null],
  "82099401": ["Crystal Seer", "unlimited", 1, 100, 100],
  "20586572": ["Exploder Dragon", "unlimited", 3, 1000, 0],
  "3019642": ["Cyberdark Keel", "unlimited", 4, 800, 800],
  "28601770": ["Mist Archfiend", "unlimited", 5, 2400, 0]
};
assert.deepEqual([...before.keys()].filter(id => !after.has(id)).sort(), removed.sort());
assert.deepEqual([...after.keys()].filter(id => !before.has(id)).sort(), Object.keys(added).sort());
assert.deepEqual([...before.keys()].filter(id => after.has(id) && before.get(id).ban_status !== after.get(id).ban_status).sort(),
  Object.keys(expectedChanges).sort());
for (const [id, oldCard] of before) {
  if (removed.includes(id)) continue;
  assert.deepEqual(after.get(id), { ...oldCard, ban_status: expectedChanges[id] || oldCard.ban_status },
    `Unrelated metadata changed: ${oldCard.name}`);
}
const expectedFields = Object.keys(august[0]).sort();
const counts = {};
for (const card of october) {
  assert.deepEqual(Object.keys(card).sort(), expectedFields);
  // The inherited pool contains both padded and unpadded printed passwords.
  assert.match(card.password, /^[0-9]{1,8}$/);
  assert(Number(card.password) > 0);
  assert(["forbidden", "limited", "semi-limited", "unlimited"].includes(card.ban_status));
  counts[card.ban_status] = (counts[card.ban_status] || 0) + 1;
}
assert.deepEqual(counts, { forbidden: 33, limited: 49, "semi-limited": 25, unlimited: 2122 });
for (const [id, expected] of Object.entries(added)) {
  const card = after.get(id);
  assert.deepEqual([card.name, card.ban_status, card.level, card.atk, card.def], expected);
  assert.equal(card.pool, "Extra Card Pool");
  assert.equal(card.printedinTCG, "Yes");
  assert(card.text.length > 30);
}
assert.equal(after.get("82099401").class, "Flip");
assert.equal(after.get("77565204").subType, "Continuous");

// Exercise the builder's actual rule mapping and admission functions with October.
const html = read("index.html");
const mapping = html.match(/cardList\.forEach\(function\(c\)\{\s*cardMap\[c\.password\]=c;[\s\S]*?\}\);/);
const limits = html.match(/var banLimit=\{[^;]+;/);
assert(mapping && limits, "Builder rule initialization changed; update this integration test");
function sourceFunction(name) {
  const start = html.indexOf(`function ${name}(`);
  assert(start >= 0, `Missing builder function ${name}`);
  const opening = html.indexOf("{", start);
  let depth = 1, end = opening + 1;
  for (; depth && end < html.length; end++) {
    if (html[end] === "{") depth++;
    if (html[end] === "}") depth--;
  }
  assert.equal(depth, 0);
  return html.slice(start, end);
}
const deck = { main: new Map(), extra: new Map(), side: new Map() };
const context = vm.createContext({ cardList: october, cardMap: {}, rules: {}, deck });
vm.runInContext(limits[0] + mapping[0] + ["cnt", "copies", "isExtraData", "isExtraDeck", "canPlace"].map(sourceFunction).join("\n"), context);
for (const id of ["77044671", "63519819", ...removed]) assert(context.canPlace(id, "main"));
for (const id of Object.keys(added)) assert.equal(context.canPlace(id, "main"), "");
deck.main.set("52467217", 1);
deck.side.set("52467217", 1);
assert.equal(context.canPlace("52467217", "main"), "Copy limit reached.");
deck.main.set("72892473", 1);
assert.equal(context.canPlace("72892473", "side"), "Copy limit reached.");
assert.equal(context.canPlace("25366484", "main"), "Fusion monsters cannot be placed in Main Deck.");
assert.equal(context.canPlace("25366484", "extra"), "");

const config = json("data/config.json");
assert(Array.isArray(json(`data/formats/${config.currentFormatId}/${config.rulesFile}`)), "Active format must resolve");
execFileSync(process.execPath, [path.join(root, "tools/build-october-2026.js"), "--check"], { stdio: "inherit" });
console.log("FORMATS_TEST PASS: 2229 cards; exact 17/6/4 delta; inherited metadata and August preserved; builder limits verified");
