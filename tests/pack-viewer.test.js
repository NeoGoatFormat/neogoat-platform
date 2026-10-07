const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const html = fs.readFileSync(path.join(__dirname, '../deck.html'), 'utf8');
function extract(name) {
  const start = html.indexOf('function ' + name + '(');
  const end = html.indexOf('\nfunction ', start + 1);
  assert(start >= 0 && end > start);
  return html.slice(start, end);
}
const context = vm.createContext({cardByName: {known: {name:'Known', password:'123', text:'Format text'}}});
for (const name of ['normName','loadDeckCardData','cardDataByName','cardPassword','cardImageByName','makeYDK']) {
  vm.runInContext(extract(name), context);
}
vm.runInContext('const IMG="https://images.ygoprodeck.com/images/cards_small/";', context);
const pack = {main_deck:[{name:'Known',password:'999',qty:1,text:'Untrusted override'}, {name:'Outside pool',password:'10000000',qty:1,text:'Pack card'}, {name:'Invalid',password:'../path',qty:1}],extra_deck:[{name:'Fusion',password:'99267150',qty:1}],side_deck:[]};
context.loadDeckCardData(pack);
assert.equal(context.cardDataByName('Known').text, 'Format text');
assert.equal(context.cardPassword('Known'), '123');
assert.equal(context.cardImageByName('Outside pool'), 'https://images.ygoprodeck.com/images/cards_small/10000000.jpg');
assert.equal(context.cardDataByName('Invalid'), null);
assert.equal(context.makeYDK(pack), '#main\n123\n10000000\n#extra\n99267150\n!side\n');
// Optional real publication payload: verify no card silently disappears from YDK.
if (process.argv[2]) {
  const posts = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  for (const post of posts) {
    context.loadDeckCardData(post);
    const expected = [...post.main_deck,...post.extra_deck,...post.side_deck].map(c=>Number(c.password)).sort((a,b)=>a-b);
    const actual = context.makeYDK(post).split('\n').filter(s=>/^\d+$/.test(s)).map(Number).sort((a,b)=>a-b);
    assert.deepEqual(actual, expected, post.title);
    assert(expected.length === (post.title === 'Gold Series 4' ? 50 : 101));
    for (const name of [post.thumbnail_card,...post.thumbnail_strip]) assert(context.cardPassword(name));
  }
}
assert(html.includes('loadCardData(deck.format);loadDeckCardData(deck);'));
console.log('PASS: pack metadata, existing format priority, invalid ID rejection and complete YDK export');
