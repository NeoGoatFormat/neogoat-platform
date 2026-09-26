// Builds the public profiles from checked-in YDKs and reviewed English guide sources.
// Optional --import reads explicitly supplied, local source/evidence directories.
// It never publishes their paths, raw reports, database, or personal decks.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const directory = path.join(root, 'data/decks');
const release = 'NeoGoat-Pro-Windows-0.3.2-beta.60';
const releaseHash = 'd2906d2ac46495156f765d8404d5f690b9c94bf76745c01908c51a1fdb8343df';
// These pins and this order come from the final beta.60 archive/client selector.
const pins = [
  ['Amazoness Aggro', '3854418918b4109d8c99c633d14c0dc1c02efde342ce7dc294f46d595b7df83d'],
  ['Archfiend Pandemonium', '73ea4bb067b888711021a9942573ca1df435d0b126602873c7d6b9cf49255fc3'],
  ['Armed Dragon', '38440ae87ee57943e6d8eb478d120161b0de116eee2f431f979941db8bb6b934'],
  ['Chaos Control', '674df208dc19ce37952effda4a18cf0da9df580bd57a1c8a7dd198ce08c75ec2'],
  ['Chaos Warrior', '23890253e627e737015334d112f682eb22720c507eab7945d89cb7bec1087b04'],
  ['Dragon Future', 'b1ff8f4f241781668b4f00c0b9f8ba51207778b65d4d4466970143b1d15cf277'],
  ['Earth Aggro', '1cb6ebb93cedb132dea3f8c2dbc8e5e1f0d5102f1491f3372dfe3caea893e949'],
  ['Frost and Flame', 'd12a071f3d1438ba4a444a8699cc61ce9296a6a1a53978cf6382a331f4603eb2'],
  ['Gravekeeper', '0f85aabc7a28b0048e5848718ec93a1bac1bbd5aabf91f2a433ed4374f5859d9'],
  ['Harpie Lady', 'c244cdce01c4fe0af01088de741322b62cb3958645780a8cae008b463b9d0778'],
  ['HERO Fusion', '4b32d88c0837c76219ec7e8f5ad60b45355a54039c5b4ad431f3517c3e10c834'],
  ['Insect Normal', '9800c5ab0231d9c76ac1badbfa46731d6e6fd2f91f2dbe82f4c4785822a5c9c7'],
  ['Mazera DeVille', '4a5eed759ee112b6f03082ac2148aa9031e4059298c977c43a6747167272b727'],
  ['Monarch', '609562bb9b75e0edd091a64d7b27eb504cac8e4805645539e39d41fba886110d'],
  ['Pyro Fire', 'a3d1cbbd058eae9b4d02bf475a1506d2863765c06c97dabc066c65c259b60a6b'],
  ['Red-Eyes', '2826b0fabde8fb58ad854ed6ac3683b73f0ba18dd2d15144913e4af2db7607d6'],
  ['Relinquished', '718b82dfd96b0ba48a6f2fa21005ee2019d81730829fad03813e80aca66ee599'],
  ['Spellcaster', 'abda71b9e565b87e018eb7289039138bd4ecaf1586b77f3befa96c6fa4578f34'],
  ['Wall Rock', 'ee37c401ad84f8a00b27e447ea34884582c2e9b1f299d3a6669040220236f3a0'],
  ['Zombie', '9930ef72e1bf39f5ca7b5e9e93c634672a173b1e57e74ef70b2700b30af6b189']
];
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const readJson = filename => JSON.parse(fs.readFileSync(filename, 'utf8'));
const outputJson = value => JSON.stringify(value, null, 2) + '\n';
const writeJson = (filename, value) => fs.writeFileSync(filename, outputJson(value));
const pool = readJson(path.join(root, 'data/formats/oct_2026/cards_oct_2026.json'));
const byId = new Map(pool.map(card => [Number(card.password), card]));
const byName = new Map(pool.map(card => [card.name, card]));

function parseYdk(bytes) {
  const result = { main: [], extra: [], side: [] };
  let section = null;
  const seen = new Set();
  for (const raw of bytes.toString('utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (['#main', '#extra', '!side'].includes(line)) {
      section = line.slice(1);
      assert(!seen.has(section), `Repeated YDK section ${section}`);
      seen.add(section);
    } else if (!line || line.startsWith('#')) continue;
    else {
      assert(section && /^\d+$/.test(line), `Invalid YDK line: ${line}`);
      result[section].push(Number(line));
    }
  }
  assert.equal(seen.size, 3, 'YDK must include Main, Extra and Side sections');
  return result;
}

function canonical(id, aliases) {
  const seen = new Set();
  while (aliases[id]) {
    assert(!seen.has(id), `Alias cycle at ${id}`);
    seen.add(id);
    id = Number(aliases[id]);
  }
  return Number(id);
}

function validateSections(sections, aliases, label) {
  assert.equal(sections.main.length, 40, `${label}: Main must have 40 cards`);
  assert.equal(sections.side.length, 15, `${label}: Side must have 15 cards`);
  assert(sections.extra.length <= 15, `${label}: Extra over 15`);
  const limits = { forbidden: 0, limited: 1, 'semi-limited': 2, unlimited: 3 };
  const counts = new Map();
  for (const [zone, ids] of Object.entries(sections)) {
    for (const id of ids) {
      const canonicalId = canonical(id, aliases);
      const card = byId.get(id) || byId.get(canonicalId);
      const ruleCard = byId.get(canonicalId) || card;
      assert(card && ruleCard, `${label}: unknown card ${id}`);
      const extra = /fusion|synchro|xyz|link/i.test(`${card.type} ${card.subType} ${card.class}`);
      if (zone === 'main') assert(!extra, `${label}: ${card.name} in Main`);
      if (zone === 'extra') assert(extra, `${label}: ${card.name} in Extra`);
      const count = (counts.get(canonicalId) || 0) + 1;
      counts.set(canonicalId, count);
      assert(count <= limits[ruleCard.ban_status], `${label}: copy limit for ${card.name}`);
    }
  }
}

function applySidePlan(sections, plan) {
  const next = Object.fromEntries(Object.entries(sections).map(([zone, ids]) => [zone, [...ids]]));
  assert.equal(Object.values(plan.in).reduce((a, b) => a + b, 0),
    Object.values(plan.out).reduce((a, b) => a + b, 0), `${plan.matchup}: unequal swaps`);
  function move(cards, from, to) {
    for (const [name, count] of Object.entries(cards)) {
      const card = byName.get(name);
      assert(card, `${plan.matchup}: missing card ${name}`);
      assert(Number.isInteger(count) && count > 0, `${plan.matchup}: invalid quantity`);
      for (let i = 0; i < count; i++) {
        const index = next[from].indexOf(Number(card.password));
        assert(index >= 0, `${plan.matchup}: unavailable ${count} ${name} in ${from}`);
        next[to].push(next[from].splice(index, 1)[0]);
      }
    }
  }
  // Validate availability against the base zones before either swap can mask it.
  for (const [zone, cards] of [['side', plan.in], ['main', plan.out]]) {
    for (const [name, count] of Object.entries(cards)) {
      const card = byName.get(name);
      assert(card && sections[zone].filter(id => id === Number(card.password)).length >= count,
        `${plan.matchup}: unavailable ${name} in original ${zone}`);
    }
  }
  move(plan.out, 'main', 'side');
  move(plan.in, 'side', 'main');
  return next;
}

function importEvidence(projectRoot, evidenceDirectory) {
  const nativeCards = readJson(path.join(evidenceDirectory, 'legal-cards.json'));
  const aliases = Object.fromEntries(nativeCards.filter(card => card.alias > 0)
    .map(card => [card.id, card.alias]));
  // Reimport only the release bytes/aliases. Reviewed English guides remain the
  // canonical editorial source; an old Spanish report must not overwrite them.
  const guides = readJson(path.join(directory, 'side-guides-oct-2026.json'));
  assert.deepEqual(Object.keys(guides).sort(), pins.map(([title]) => title).sort());
  const archive = path.join(projectRoot, 'releases', release, release + '.zip');
  assert.equal(hash(fs.readFileSync(archive)), releaseHash, 'Unexpected final Windows archive');
  const selector = fs.readFileSync(path.join(projectRoot, 'ygopro-master/gframe/neogoat_deck_selector.h'), 'utf8');
  const selectorNames = [...selector.matchAll(/\{L"([^"]+)", L"[a-f0-9]+"\}/g)].map(match => match[1]);
  assert.deepEqual(selectorNames, pins.map(([title]) => title), 'Client order changed');
  fs.mkdirSync(path.join(directory, 'oct_2026'), { recursive: true });
  const inputs = [];
  for (const [title, sha256] of pins) {
    const filename = title + '.ydk';
    const bytes = fs.readFileSync(path.join(projectRoot, 'android-package-beta51/assets/defaults/deck', filename));
    assert.equal(hash(bytes), sha256, `${title}: source differs from final beta.60`);
    for (const subdirectory of [`releases/${release}/${release}/deck`, 'android-package-beta51/assets/update/deck']) {
      assert(fs.readFileSync(path.join(projectRoot, subdirectory, filename)).equals(bytes), `${title}: release inputs disagree`);
    }
    const sections = parseYdk(bytes);
    validateSections(sections, aliases, title);
    for (const plan of guides[title].side_plans) validateSections(applySidePlan(sections, plan), aliases, `${title}: ${plan.matchup}`);
    inputs.push([filename, bytes]);
  }
  for (const [filename, bytes] of inputs) fs.writeFileSync(path.join(directory, 'oct_2026', filename), bytes);
  writeJson(path.join(directory, 'card-aliases.json'), aliases);
  console.log('DEFAULT_PROFILE_IMPORT PASS: 20 exact beta.60 YDKs; reviewed English guides preserved; no source paths exported');
}

function communityPost(deck) {
  const guide = deck.guide;
  const section = (heading, items) => heading + '\n' + items.map(text => '- ' + text).join('\n');
  const swaps = cards => Object.entries(cards).map(([name, count]) => count + ' x ' + name).join('; ');
  const description = [
    deck.description,
    'NeoGoat Pro 0.3.2 beta.60 default deck | October 2026',
    'PLAY GUIDE\n' + guide.summary,
    section('Game Plan', guide.game_plan),
    section('Opening Turns', guide.opening),
    section('Key Plays and Synergies', guide.key_plays),
    section('Common Mistakes', guide.pitfalls),
    'SIDE DECK GUIDE\n' + guide.side_intro,
    section('Side Card Roles', guide.side_cards.map(card => card.count + ' x ' + card.name + ': ' + card.reason)),
    'Matchup Side Plans\n\n' + guide.side_plans.map(plan =>
      plan.matchup + '\nSide In: ' + swaps(plan.in) + '\nSide Out: ' + swaps(plan.out) + '\n' + plan.note
    ).join('\n\n')
  ].join('\n\n');
  const post = Object.fromEntries(['slug', 'title', 'author_name', 'format', 'archetype', 'thumbnail_card', 'thumbnail_strip']
    .map(key => [key, deck[key]]));
  post.description = description;
  for (const zone of ['main', 'extra', 'side']) post[zone + '_deck'] = deck[zone + '_deck'].map(({name, qty}) => ({name, qty}));
  post.is_public = true;
  const clean = list => list.map(card => ({name:card.name.trim().toLowerCase(),qty:card.qty}))
    .sort((a,b) => a.name.localeCompare(b.name));
  // Same duplicate signature as the existing Share Deck form.
  post.deck_signature = JSON.stringify({format:post.format,main:clean(post.main_deck),extra:clean(post.extra_deck),side:clean(post.side_deck)});
  return post;
}

function build(check = false) {
  const aliases = readJson(path.join(directory, 'card-aliases.json'));
  const manifest = readJson(path.join(directory, 'source-manifest-oct-2026.json'));
  const sideGuides = readJson(path.join(directory, 'side-guides-oct-2026.json'));
  const playGuides = readJson(path.join(directory, 'play-guides-oct-2026.json'));
  function entries(ids) {
    const quantities = new Map();
    for (const id of ids) quantities.set(id, (quantities.get(id) || 0) + 1);
    return [...quantities].map(([id, qty]) => {
      const card = byId.get(id) || byId.get(canonical(id, aliases));
      return { name: card.name, qty, password: card.password };
    });
  }
  assert.deepEqual(manifest.decks.map(deck => [deck.title, deck.sha256]), pins);
  assert.deepEqual(Object.keys(playGuides).sort(), pins.map(([title]) => title).sort());
  const decks = manifest.decks.map(source => {
    const bytes = fs.readFileSync(path.join(directory, source.file));
    assert.equal(hash(bytes), source.sha256, `${source.title}: YDK bytes changed`);
    const sections = parseYdk(bytes);
    validateSections(sections, aliases, source.title);
    const play = playGuides[source.title];
    const side = sideGuides[source.title];
    assert(play && side, `Missing guides for ${source.title}`);
    for (const key of ['game_plan', 'opening', 'key_plays', 'pitfalls']) {
      assert(Array.isArray(play[key]) && play[key].length >= 2 && play[key].every(text => typeof text === 'string' && text.length > 20),
        `${source.title}: incomplete ${key}`);
    }
    for (const plan of side.side_plans) validateSections(applySidePlan(sections, plan), aliases, `${source.title}: ${plan.matchup}`);
    assert.deepEqual(Object.fromEntries(side.side_cards.map(card => [card.name, card.count]).sort()),
      Object.fromEntries(entries(sections.side).map(card => [card.name, card.qty]).sort()), `${source.title}: side explanations differ from YDK`);
    const slug = 'neogoat-pro-oct-2026-' + source.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const main = entries(sections.main), extra = entries(sections.extra), sideDeck = entries(sections.side);
    const thumbnail = play.thumbnail_card || main[0].name;
    const strip = play.thumbnail_strip || main.slice(0, 3).map(card => card.name);
    for (const name of [thumbnail, ...strip]) assert([...main, ...extra].some(card => card.name === name), `${source.title}: thumbnail absent from deck: ${name}`);
    return {
      id: slug, slug, title: source.title, author_name: 'NeoGoat Pro', format: 'oct_2026',
      is_public: true, is_default: true, default_order: source.default_order, created_at: '2026-09-26T00:00:00Z',
      archetype: play.archetype, description: play.description,
      main_deck: main, extra_deck: extra, side_deck: sideDeck,
      thumbnail_card: thumbnail, thumbnail_strip: strip,
      source_sha256: source.sha256, ydk_path: '/data/decks/' + source.file,
      guide: {
        summary: play.summary, game_plan: play.game_plan, opening: play.opening,
        key_plays: play.key_plays, pitfalls: play.pitfalls,
        side_intro: 'Each plan starts from the original deck list and swaps an equal number of cards in and out. Choose a plan based on what you saw in Game 1; do not combine complete plans. These are practice guidelines with verified card counts and legality, not claims of proven performance in human matches.',
        side_cards: side.side_cards, side_plans: side.side_plans
      }
    };
  });
  const result = { format: 'oct_2026', version: '0.3.2 beta.60', decks };
  const target = path.join(directory, 'neogoat-pro-oct-2026.json');
  const output = outputJson(result);
  assert(!/[A-Z]:\\|C:\/Users\/|D:\/Codex\/|\/opt\/neogoat-server/i.test(output), 'Private path in public profile');
  if (check) assert.equal(fs.readFileSync(target, 'utf8').replace(/\r\n/g, '\n'), output, 'Default profiles need regeneration');
  else fs.writeFileSync(target, output);
  const postsTarget = path.join(directory, 'community-posts-oct-2026.json');
  const postsOutput = outputJson(decks.map(communityPost));
  if (check) assert.equal(fs.readFileSync(postsTarget, 'utf8').replace(/\r\n/g, '\n'), postsOutput, 'Community posts need regeneration');
  else fs.writeFileSync(postsTarget, postsOutput);
  console.log(`DEFAULT_PROFILES_${check ? 'CHECK' : 'BUILD'} PASS: ${decks.length} profiles, ${decks.reduce((total, deck) => total + deck.guide.side_plans.length, 0)} validated side plans`);
  return result;
}

if (require.main === module) {
  const args = process.argv.slice(2);
  if (args[0] === '--import' && args.length === 3) importEvidence(path.resolve(args[1]), path.resolve(args[2]));
  else {
    assert(args.length === 0 || (args.length === 1 && args[0] === '--check'),
      'Usage: node tools/build-default-profiles.js [--check | --import SOURCE_PROJECT SIDE_REVIEW_DIRECTORY]');
    build(args[0] === '--check');
  }
}
module.exports = { parseYdk, canonical, validateSections, applySidePlan, communityPost, build };
