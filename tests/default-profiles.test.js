const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { validateSections, applySidePlan, communityPost } = require('../tools/build-default-profiles.js');
const root = path.resolve(__dirname, '..');
const load = name => JSON.parse(fs.readFileSync(path.join(root, name), 'utf8'));
const published = load('data/decks/neogoat-pro-oct-2026.json');
const posts = load('data/decks/community-posts-oct-2026.json');
assert.equal(posts.length, 20);
const manifest = load('data/decks/source-manifest-oct-2026.json');
const aliases = load('data/decks/card-aliases.json');
const pool = load('data/formats/oct_2026/cards_oct_2026.json');
const byId = new Map(pool.map(card => [Number(card.password), card]));
const byName = new Map(pool.map(card => [card.name, card]));
const names = ['Amazoness Aggro', 'Archfiend Pandemonium', 'Armed Dragon', 'Chaos Control',
  'Chaos Warrior', 'Dragon Future', 'Earth Aggro', 'Frost and Flame', 'Gravekeeper',
  'Harpie Lady', 'HERO Fusion', 'Insect Normal', 'Mazera DeVille', 'Monarch', 'Pyro Fire',
  'Red-Eyes', 'Relinquished', 'Spellcaster', 'Wall Rock', 'Zombie'];
assert.equal(published.format, 'oct_2026');
assert.equal(published.version, '0.3.2 beta.60');
assert.deepEqual(published.decks.map(deck => deck.title), names, 'Exact client selector inventory and order');
assert.equal(new Set(published.decks.map(deck => deck.id)).size, 20);
assert.equal(new Set(published.decks.map(deck => deck.slug)).size, 20);
assert.deepEqual(fs.readdirSync(path.join(root, 'data/decks/oct_2026')).sort(), names.map(name => name + '.ydk').sort());
assert.equal(manifest.windows_archive_sha256, 'd2906d2ac46495156f765d8404d5f690b9c94bf76745c01908c51a1fdb8343df');
assert.equal(manifest.native_format_hash, '8A84D6ED');
const sum = entries => entries.reduce((total, item) => total + item.qty, 0);
const multiset = ids => Object.fromEntries([...new Set(ids)].sort((a, b) => a - b).map(id => [id, ids.filter(value => value === id).length]));
const expand = entries => entries.flatMap(item => Array(item.qty).fill(Number(item.password)));
const countsByName = entries => Object.fromEntries(entries.map(item => [item.name, item.qty]).sort());
let plans = 0;
for (const [index, deck] of published.decks.entries()) {
  const label = deck.title;
  assert.equal(deck.id, deck.slug);
  assert.match(deck.slug, /^neogoat-pro-oct-2026-[a-z0-9-]+$/);
  assert.equal(deck.author_name, 'NeoGoat Pro');
  assert.equal(deck.format, 'oct_2026');
  assert.equal(deck.is_default, true);
  assert.equal(deck.is_public, true);
  assert.equal(deck.default_order, index + 1);
  assert.equal(deck.created_at, '2026-09-26T00:00:00Z');
  assert.equal(sum(deck.main_deck), 40, label);
  assert.equal(sum(deck.side_deck), 15, label);
  assert(sum(deck.extra_deck) <= 15, label);
  assert.equal(deck.ydk_path, '/data/decks/oct_2026/' + label + '.ydk');
  const bytes = fs.readFileSync(path.join(root, deck.ydk_path.slice(1)));
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), deck.source_sha256, `${label}: original download hash`);
  assert.equal(deck.source_sha256, manifest.decks[index].sha256, `${label}: release provenance`);
  // Independently parse the three release sections and compare their card multisets.
  const sections = { main: [], extra: [], side: [] };
  let zone;
  for (const line of bytes.toString('utf8').split(/\r?\n/)) {
    if (line === '#main') zone = 'main';
    else if (line === '#extra') zone = 'extra';
    else if (line === '!side') zone = 'side';
    else if (/^\d+$/.test(line)) sections[zone].push(Number(line));
  }
  for (const zone of ['main', 'extra', 'side']) {
    const entries = deck[zone + '_deck'];
    assert.equal(new Set(entries.map(card => Number(card.password))).size, entries.length, `${label}: duplicate rows`);
    assert.deepEqual(multiset(expand(entries)), multiset(sections[zone]), `${label}: published ${zone} equals shipped YDK`);
    for (const card of entries) {
      assert(Number.isInteger(card.qty) && card.qty >= 1 && card.qty <= 3);
      assert.equal(byId.get(Number(card.password))?.name, card.name, `${label}: actual website card name`);
    }
  }
  validateSections(sections, aliases, label);
  for (const name of [deck.thumbnail_card, ...deck.thumbnail_strip]) {
    assert([...deck.main_deck, ...deck.extra_deck].some(card => card.name === name), `${label}: thumbnail must be included`);
  }
  assert(deck.archetype && deck.description.length > 40, label);
  const guide = deck.guide;
  const post = posts[index];
  assert.deepEqual(post, communityPost(deck), `${label}: reproducible ordinary post`);
  assert.deepEqual(Object.keys(post).sort(), ['slug', 'title', 'author_name', 'format', 'archetype', 'thumbnail_card', 'thumbnail_strip', 'description', 'main_deck', 'extra_deck', 'side_deck', 'is_public', 'deck_signature'].sort(), `${label}: existing Share Deck schema only`);
  assert(post.description.includes('PLAY GUIDE\n' + guide.summary));
  assert(post.description.includes('SIDE DECK GUIDE\n' + guide.side_intro));
  for (const field of ['game_plan', 'opening', 'key_plays', 'pitfalls']) {
    for (const text of guide[field]) assert(post.description.includes(text), `${label}: complete ${field} in description`);
  }
  for (const card of guide.side_cards) assert(post.description.includes(card.reason));
  for (const plan of guide.side_plans) {
    assert(post.description.includes(plan.matchup) && post.description.includes(plan.note));
    for (const cards of [plan.in, plan.out]) for (const [name, count] of Object.entries(cards)) assert(post.description.includes(count + ' x ' + name));
  }
  assert(!/Guía de|Cada plan parte|Se conserva|El mazo|Invocación|cementerio|contra mazos|presión|monstruos|respuestas/.test(post.description), `${label}: no previous Spanish guide text`);
  assert(guide.summary.length > 40 && guide.side_intro.length > 60, label);
  for (const field of ['game_plan', 'opening', 'key_plays', 'pitfalls']) {
    assert(Array.isArray(guide[field]) && guide[field].length >= 2 && guide[field].every(value => value.length > 20), `${label}: ${field}`);
  }
  assert.deepEqual(Object.fromEntries(guide.side_cards.map(card => [card.name, card.count]).sort()), countsByName(deck.side_deck),
    `${label}: every Side copy has an explanation`);
  assert(guide.side_cards.every(card => card.reason.length > 40));
  assert(guide.side_plans.length >= 4);
  for (const plan of guide.side_plans) {
    assert(plan.matchup.length > 5 && plan.note.length > 30);
    const main = { ...countsByName(deck.main_deck) }, side = { ...countsByName(deck.side_deck) };
    let incoming = 0, outgoing = 0;
    for (const [name, count] of Object.entries(plan.in)) {
      assert(byName.has(name), `${label}: ${plan.matchup} unknown incoming card`);
      assert(Number.isInteger(count) && count > 0 && side[name] >= count, `${label}: ${plan.matchup} incoming quantity`);
      incoming += count;
    }
    for (const [name, count] of Object.entries(plan.out)) {
      assert(byName.has(name), `${label}: ${plan.matchup} unknown outgoing card`);
      assert(Number.isInteger(count) && count > 0 && main[name] >= count, `${label}: ${plan.matchup} outgoing quantity`);
      outgoing += count;
    }
    assert.equal(incoming, outgoing, `${label}: balanced swap`);
    const post = applySidePlan(sections, plan);
    assert.deepEqual(multiset(Object.values(post).flat()), multiset(Object.values(sections).flat()), `${label}: Side conserves every physical card`);
    assert.deepEqual(post.extra, sections.extra, `${label}: Extra preserved by Main/Side swaps`);
    validateSections(post, aliases, `${label}: ${plan.matchup}`);
    plans++;
  }
  for (const card of deck.side_deck) {
    assert(guide.side_plans.some(plan => (plan.in[card.name] || 0) >= card.qty), `${label}: all copies of ${card.name} have a documented use`);
  }
}
assert.equal(plans, 105);

// Negative controls exercise meaningful failures, including alias-equivalent copies.
const harpie = published.decks.find(deck => deck.title === 'Harpie Lady');
const invalidHarpie = Object.fromEntries(['main', 'extra', 'side'].map(zone => [zone, expand(harpie[zone + '_deck'])]));
assert.equal(aliases['91932350'], 76812113, 'Harpie Lady 1 shares the printed-name limit');
assert.equal(aliases['27927359'], 76812113, 'Harpie Lady 2 shares the printed-name limit');
const nonHarpie = invalidHarpie.main.findIndex(id => id !== 91932350);
invalidHarpie.main[nonHarpie] = 27927359;
assert.throws(() => validateSections(invalidHarpie, aliases, 'alias negative'), /copy limit/);
const insect = published.decks.find(deck => deck.title === 'Insect Normal');
const insectSections = Object.fromEntries(['main', 'extra', 'side'].map(zone => [zone, expand(insect[zone + '_deck'])]));
assert.throws(() => applySidePlan(insectSections, {
  matchup: 'obsolete side negative', in: { 'Soul Release': 2 }, out: { 'Nobleman of Crossout': 1, 'Ancient Rules': 1 }
}), /unavailable/);
assert.equal(insect.main_deck.find(card => card.name === 'Foolish Burial'), undefined);
assert.equal(insect.side_deck.find(card => card.name === '4-Starred Ladybug of Doom').qty, 2);
const redEyes = published.decks.find(deck => deck.title === 'Red-Eyes');
assert(redEyes.main_deck.some(card => card.name === 'Red-Eyes B. Dragon'));
assert(redEyes.extra_deck.some(card => card.name === 'B. Skull Dragon'));
const serialized = JSON.stringify(published);
assert(!/[A-Z]:\\|C:\/Users\/|D:\/Codex\/|\/opt\/neogoat-server/i.test(serialized), 'No private paths in public profiles');
execFileSync(process.execPath, [path.join(root, 'tools/build-default-profiles.js'), '--check'], { stdio: 'inherit' });
console.log('DEFAULT_PROFILES_TEST PASS: 20 original beta.60 lists, October alias-aware legality, 105 conserved Side plans, complete guides and downloads');
