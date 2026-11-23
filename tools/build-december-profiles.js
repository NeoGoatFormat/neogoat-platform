// Rebuild ordinary December deck posts from exact release YDKs and reviewed copy.
// This tool is offline and never publishes or updates database records.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { parseYdk, canonical } = require('./build-default-profiles');
const root = path.resolve(__dirname, '..');
const directory = path.join(root, 'data/decks');
const json = filename => JSON.parse(fs.readFileSync(filename, 'utf8'));
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const pool = json(path.join(root, 'data/formats/dec_2026/cards_dec_2026.json'));
const byId = new Map(pool.map(card => [Number(card.password), card]));
const aliases = json(path.join(directory, 'card-aliases.json'));

function validateSections(sections, label) {
  assert.equal(sections.main.length, 40, `${label}: Main must contain 40 cards`);
  assert.equal(sections.side.length, 15, `${label}: Side must contain 15 cards`);
  assert(sections.extra.length <= 15, `${label}: Extra exceeds 15 cards`);
  const counts = new Map();
  const limits = { forbidden: 0, limited: 1, 'semi-limited': 2, unlimited: 3 };
  for (const [zone, ids] of Object.entries(sections)) {
    for (const id of ids) {
      const ruleId = canonical(id, aliases);
      const card = byId.get(id) || byId.get(ruleId);
      const rule = byId.get(ruleId) || card;
      assert(card && rule, `${label}: card ${id} is outside December`);
      const fusion = String(card.subType).toLowerCase() === 'fusion';
      if (zone === 'main') assert(!fusion, `${label}: Fusion in Main`);
      if (zone === 'extra') assert(fusion, `${label}: non-Fusion in Extra`);
      const count = (counts.get(ruleId) || 0) + 1;
      counts.set(ruleId, count);
      assert(count <= limits[rule.ban_status], `${label}: copy limit exceeded for ${card.name}`);
    }
  }
}

function entries(ids) {
  const quantities = new Map();
  for (const id of ids) {
    const card = byId.get(id) || byId.get(canonical(id, aliases));
    const entry = quantities.get(card.name) || { name: card.name, qty: 0, password: card.password };
    entry.qty += 1;
    quantities.set(card.name, entry);
  }
  return [...quantities.values()];
}

function deckSignature(post) {
  const clean = list => list.map(card => ({ name: card.name.trim().toLowerCase(), qty: card.qty }))
    .sort((a, b) => a.name.localeCompare(b.name));
  return JSON.stringify({ format: post.format, main: clean(post.main_deck), extra: clean(post.extra_deck), side: clean(post.side_deck) });
}

function build(check = false) {
  const manifest = json(path.join(directory, 'source-manifest-dec-2026.json'));
  const guides = json(path.join(directory, 'play-guides-dec-2026.json'));
  assert.equal(manifest.decks.length, 20);
  assert.equal(manifest.release_sha256, '8d7ea16c68b7584dad2b343e53fd24fe30b7b4f258ccdbe25638c56a9cd7bade');
  const poolBytes = fs.readFileSync(path.join(root, 'data/formats/dec_2026/cards_dec_2026.json'), 'utf8').replace(/\r\n/g, '\n');
  assert.equal(hash(poolBytes), manifest.web_pool_lf_sha256);
  assert.deepEqual(Object.keys(guides).sort(), manifest.decks.map(deck => deck.title).sort());
  const posts = manifest.decks.map(source => {
    const bytes = fs.readFileSync(path.join(directory, source.file));
    assert.equal(hash(bytes), source.sha256, `${source.title}: release YDK changed`);
    const sections = parseYdk(bytes);
    validateSections(sections, source.title);
    assert.deepEqual(Object.fromEntries(Object.entries(sections).map(([zone, ids]) => [zone, ids.length])), source.counts);
    const guide = guides[source.title];
    const thumbnails = guide.thumbnail_strip;
    assert.equal(thumbnails.length, 3, `${source.title}: exactly three thumbnails required`);
    assert.equal(new Set(thumbnails).size, 3, `${source.title}: thumbnails must be distinct`);
    const names = new Set(entries([...sections.main, ...sections.extra]).map(card => card.name));
    for (const name of thumbnails) assert(names.has(name), `${source.title}: thumbnail absent from Main/Extra: ${name}`);
    assert(guide.description.includes('GAME PLAN\n') && guide.description.includes('SIDE DECK PLAN\n'), `${source.title}: incomplete guide`);
    assert(guide.description.split(/\s+/).length >= 140, `${source.title}: description too short`);
    const post = {
      slug: 'neogoat-pro-dec-2026-' + source.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      title: source.title, author_name: 'neogoat pro', format: 'dec_2026', archetype: guide.archetype,
      description: guide.description + '\n\nIncluded with NeoGoat Pro 0.3.2 beta.78 | December 2026.',
      main_deck: entries(sections.main), extra_deck: entries(sections.extra), side_deck: entries(sections.side),
      thumbnail_card: thumbnails[0], thumbnail_strip: thumbnails, is_public: true
    };
    post.deck_signature = deckSignature(post);
    return post;
  });
  assert.equal(new Set(posts.map(post => post.slug)).size, 20);
  assert.equal(new Set(posts.map(post => post.deck_signature)).size, 20);
  const output = JSON.stringify(posts, null, 2) + '\n';
  assert(!/[A-Z]:\\|C:\/Users\/|C:\/NeoGoat\/|\/opt\/neogoat-server/i.test(output), 'Private source path in posts');
  const target = path.join(directory, 'community-posts-dec-2026.json');
  if (check) assert.equal(fs.readFileSync(target, 'utf8').replace(/\r\n/g, '\n'), output, 'December posts need regeneration');
  else fs.writeFileSync(target, output);
  console.log(`DECEMBER_PROFILES_${check ? 'CHECK' : 'BUILD'} PASS: 20 release-exact legal decks, 60 selected thumbnails`);
  return posts;
}

if (require.main === module) {
  assert(process.argv.length === 2 || (process.argv.length === 3 && process.argv[2] === '--check'), 'Usage: node tools/build-december-profiles.js [--check]');
  build(process.argv[2] === '--check');
}
module.exports = { build, validateSections, deckSignature, entries };
