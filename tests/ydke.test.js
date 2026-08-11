const assert=require("assert");
const ydke=require("../ydke.js");

const deck={main:[1,23401839,0xffffffff],extra:[2],side:[3,4]};
const encoded="ydke://AQAAAG8VZQH/////!AgAAAA==!AwAAAAQAAAA=!";
assert.strictEqual(ydke.stringify(deck),encoded);
assert.deepStrictEqual(ydke.parse(encoded),deck);
assert.deepStrictEqual(ydke.parse("\r\n  "+encoded+"  \r\n"),deck);
assert.throws(()=>ydke.parse("AQAAAA==!!!"));
assert.throws(()=>ydke.parse("ydke://AQAAAA=!!!"));
assert.throws(()=>ydke.parse("ydke://AQAAAA==!!!junk"));
assert.throws(()=>ydke.parse("ydke://!!!!"));

console.log("YDKE_WEB_TEST PASS",encoded);
