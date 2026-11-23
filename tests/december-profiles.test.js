const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { build, validateSections, deckSignature, entries } = require('../tools/build-december-profiles');
const { parseYdk } = require('../tools/build-default-profiles');
const root = path.resolve(__dirname, '..');
const read = name => JSON.parse(fs.readFileSync(path.join(root, name), 'utf8'));
const manifest = read('data/decks/source-manifest-dec-2026.json');
const posts = build(true);

for (const [index, post] of posts.entries()) {
  const source = manifest.decks[index];
  const sections = parseYdk(fs.readFileSync(path.join(root, 'data/decks', source.file)));
  for (const zone of ['main', 'extra', 'side']) {
    assert.deepEqual(post[zone + '_deck'], entries(sections[zone]), `${post.title}: card inventory differs from release`);
    assert(post[zone + '_deck'].every(card => /^\d+$/.test(String(card.password))), `${post.title}: missing image/export ID`);
  }
  assert.equal(post.author_name, 'neogoat pro');
  assert.equal(post.format, 'dec_2026');
  assert.equal(post.is_public, true);
  assert.equal(post.thumbnail_card, post.thumbnail_strip[0]);
  assert.equal(new Set(post.thumbnail_strip).size, 3);
  assert.equal(post.deck_signature, deckSignature(post));
}

const warrior = parseYdk(fs.readFileSync(path.join(root, 'data/decks', manifest.decks[0].file)));
const invalid = structuredClone(warrior);
// Pot of Greed was legal in October and forbidden in December: the release
// validator must reject a plausible stale-format import without changing size.
invalid.main[0] = 55144522;
assert.throws(() => validateSections(invalid, 'stale October card'), /copy limit exceeded/);
const tooMany = structuredClone(warrior);
// The Main/Side boundary must not permit a second Limited Graceful Charity.
tooMany.side[0] = 79571449;
assert.throws(() => validateSections(tooMany, 'cross-zone limit'), /copy limit exceeded/);
const extraMonster = structuredClone(warrior);
extraMonster.extra.push(warrior.main[0]);
assert.throws(() => validateSections(extraMonster, 'invalid Extra'), /non-Fusion/);
const trick = posts.find(post => post.title === 'Wind Skill Drain');
assert.equal(trick.main_deck.find(card => card.name === 'The Tricky').qty, 1);
assert.deepEqual(posts.map(post => post.extra_deck.reduce((sum, card) => sum + card.qty, 0)), [0,0,0,5,0,0,0,0,0,2,0,0,0,0,0,0,15,0,0,0]);
console.log('DECEMBER_PROFILES_TEST PASS: exact 20 published inventories, thumbnails, signatures and December rejection cases');
