// Optional browser regression: node tests/profiles-ui.test.js (requires Playwright + Chromium).
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const { chromium } = require("playwright");
const root = path.resolve(__dirname, "..");
const catalog = JSON.parse(fs.readFileSync(path.join(root, "data/decks/neogoat-pro-oct-2026.json"), "utf8"));
const community = {id:"archive-fixture",slug:"archive-fixture",title:"Archived August profile",author_name:"Community fixture",format:"aug_2026",created_at:"2026-08-01T12:00:00Z",main_deck:[{name:"Foolish Return",qty:1}],extra_deck:[],side_deck:[]};

(async () => {
  const server = http.createServer((req,res) => {
    const url = new URL(req.url, "http://localhost");
    const relative = decodeURIComponent(url.pathname).replace(/^\/+/, "") || "index.html";
    const file = path.resolve(root, relative);
    if (!file.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
    fs.readFile(file, (error, data) => {
      if (error) { res.writeHead(404); res.end(); return; }
      res.setHeader("Content-Type", ({".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".json":"application/json; charset=utf-8",".ydk":"text/plain; charset=utf-8"})[path.extname(file)] || "application/octet-stream");
      res.end(data);
    });
  });
  await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
  const base = "http://127.0.0.1:" + server.address().port;
  const browser = await chromium.launch({headless:true});
  const context = await browser.newContext({viewport:{width:1365,height:1000},acceptDownloads:true});
  const errors=[];
  let communityUnavailable=false;
  await context.route("**/*", async route=>{
    const request=route.request(), url=request.url();
    if(url.startsWith(base))return route.continue();
    // No external writes or dependence on the live community DB/card-art services.
    assert.equal(request.method(),"GET","Browser tests must never submit anything");
    if(url.includes("/rest/v1/decks?")){
      const slug=new URL(url).searchParams.get("slug");
      return route.fulfill({status:communityUnavailable?503:200,contentType:"application/json",body:JSON.stringify(!slug||slug==="eq."+community.slug?[community]:[])});
    }
    if(url.includes("/rest/v1/deck_comments?"))return route.fulfill({status:200,contentType:"application/json",body:"[]"});
    return route.abort();
  });
  const page=await context.newPage();
  page.on("pageerror",error=>errors.push(error.message));
  let checked=0;
  try{
    await page.goto(base+"/index.html");
    await page.waitForFunction(()=>document.getElementById("statusBadge").textContent==="2229 cards loaded");
    assert.equal(await page.locator("#searchResults .scard").count(),80,"Fresh builder renders the card search");
    assert.match(await page.locator("#fmtLabel").innerText(),/OCTOBER 2026/);
    await page.goto(base+"/decks.html?collection=defaults");
    await page.locator("#grid").waitFor({state:"visible"});
    assert.equal(await page.locator("#grid > a").count(),20);
    assert.match(await page.locator("#currentFormatText").innerText(),/OCTOBER 2026/);
    await page.locator("#fSearch").fill("Harpie");
    assert.equal(await page.locator("#grid > a").count(),1);
    await page.locator("#fSearch").fill("");
    await page.locator("#fSource").selectOption("community");
    await page.locator("#fFormat").selectOption("aug_2026");
    assert.equal(await page.locator("#grid > a").count(),1);
    await page.locator("#grid > a").click();
    await page.locator("#page").waitFor({state:"visible"});
    assert.equal(await page.locator("#dTitle").innerText(),community.title);
    assert(!(await page.locator("#playGuide").isVisible()));
    assert(await page.locator("#commentsBox").isVisible());
    assert.match(await page.locator("#previewText").innerText(),/Graveyard|\bGY\b/i,"Historical profiles retain their own card data");
    community.format="feb_2026";community.main_deck=[{name:"Miracle Fertilizer",qty:1}];
    await page.reload();
    await page.locator("#page").waitFor({state:"visible"});
    assert.equal(await page.locator("#previewName").innerText(),"Miracle Fertilizer");
    assert.match(await page.locator("#previewImg").getAttribute("src"),/44887817/);
    const archivedDownloadPromise=page.waitForEvent("download");
    await page.locator("#exportYDKBtn").click();
    assert.match(fs.readFileSync(await (await archivedDownloadPromise).path(),"utf8"),/44887817/,"February export preserves cards removed in October");

    for(const deck of catalog.decks){
      await page.goto(base+"/deck.html?slug="+encodeURIComponent(deck.slug));
      await page.locator("#page").waitFor({state:"visible"});
      assert.equal(await page.locator("#dTitle").innerText(),deck.title);
      assert.equal(await page.locator("#mainCount").innerText(),"Main 40");
      assert.equal(await page.locator("#sideCount").innerText(),"Side 15");
      assert.equal(await page.locator("#sideGuide details").count(),deck.guide.side_plans.length);
      assert(await page.locator("#playGuide").isVisible());
      assert(!(await page.locator("#commentsBox").isVisible()));
      await page.locator("#sideGuide summary").first().click();
      assert(await page.locator("#sideGuide .planBody").first().isVisible());
      const downloadPromise=page.waitForEvent("download");
      await page.locator("#exportYDKBtn").click();
      const download=await downloadPromise;
      assert.equal(download.suggestedFilename(),deck.title+".ydk");
      assert.deepEqual(fs.readFileSync(await download.path()),fs.readFileSync(path.join(root,decodeURIComponent(deck.ydk_path).replace(/^\//,""))));
      await page.locator("#builderBtn").click();
      await page.waitForURL("**/index.html");
      await page.waitForFunction(()=>document.getElementById("cntMain").textContent==="40");
      assert.equal(await page.locator("#cntSide").innerText(),"15",deck.title+" side import");
      assert.equal(await page.locator("#cntExtra").innerText(),String(deck.extra_deck.reduce((n,c)=>n+c.qty,0)),deck.title+" extra import");
      assert.equal(await page.locator("#validation").innerText(),"Deck OK",deck.title+" legality");
      checked++;
    }

    communityUnavailable=true;
    await page.goto(base+"/decks.html");
    await page.locator("#grid").waitFor({state:"visible"});
    assert.equal(await page.locator("#grid > a").count(),20);
    assert.match(await page.locator("#libraryNotice").innerText(),/comunidad/);
    await page.setViewportSize({width:390,height:844});
    await page.goto(base+"/deck.html?slug="+catalog.decks[0].slug);
    await page.locator("#page").waitFor({state:"visible"});
    assert(await page.locator("#guideLinks").isVisible());
    await page.locator("#guideLinks a").last().click();
    await page.locator("#sideGuide summary").first().click();
    assert(await page.locator("#sideGuide .planBody").first().isVisible());
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),"Mobile page must not overflow horizontally");
    communityUnavailable=false;
    await page.goto(base+"/deck.html?slug=neogoat-pro-oct-2026-missing");
    await page.locator("#notfound").waitFor({state:"visible"});
    assert.deepEqual(errors,[],"No unhandled browser exceptions");
    console.log("PROFILES_UI PASS: "+checked+" profiles, exact YDK downloads, builder imports, guides, archive, filters, DB outage and mobile");
  }finally{
    await browser.close();
    await new Promise(resolve=>server.close(resolve));
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
