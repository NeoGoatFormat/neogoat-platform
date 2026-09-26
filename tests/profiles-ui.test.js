// Optional browser regression: node tests/profiles-ui.test.js (requires Playwright + Chromium).
// Every community response is a fixture. No external writes or live services are used.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const { chromium } = require("playwright");
const root = path.resolve(__dirname, "..");
const load = file => JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
const catalog = load("data/decks/neogoat-pro-oct-2026.json");
const payload = load("data/decks/community-posts-oct-2026.json");
assert(Array.isArray(payload), "Publication payload must be a normal post array");
assert.equal(payload.length, 20);
const posts = payload.map((post, index) => ({
  ...post, id: "post-fixture-" + (index + 1), created_at: "2026-09-26T12:00:00Z"
}));
assert.deepEqual(posts.map(post => post.title), catalog.decks.map(deck => deck.title));
const archive = {
  id: "archive-fixture", slug: "archive-fixture", title: "Archived August profile",
  author_name: "Community fixture", archetype: "Archive", format: "aug_2026",
  description: "An ordinary historical community profile.", is_public: true,
  created_at: "2026-08-01T12:00:00Z", main_deck: [{ name: "Foolish Return", qty: 1 }],
  extra_deck: [], side_deck: []
};
const comment = {
  author_name: "Fixture reader", comment: "Regular community comment.\nLiteral <b>text</b>.",
  created_at: "2026-09-26T12:00:00Z"
};
const zones = ["main", "extra", "side"];
const total = cards => cards.reduce((sum, card) => sum + Number(card.qty), 0);
const norm = value => String(value || "").toLowerCase().normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "").replace(/[’']/g, "").replace(/[^a-z0-9]+/g, " ").trim();
const multiset = ids => [...ids].map(Number).sort((a, b) => a - b);
function parseYDK(text) {
  const sections = { main: [], extra: [], side: [] };
  let zone;
  for (const line of text.split(/\r?\n/).map(value => value.trim())) {
    if (line === "#main") zone = "main";
    else if (line === "#extra") zone = "extra";
    else if (line === "!side") zone = "side";
    else if (/^\d+$/.test(line)) {
      assert(zone, "YDK card must follow a section marker");
      sections[zone].push(Number(line));
    }
  }
  return sections;
}
const specialUI = "#fSource, #guideLinks, #guideBox, #playGuide, #sideGuide, #libraryNotice, .defaultBadge, .sourceBadge";
for (const name of ["index.html", "deck.html", "decks.html"]) {
  const html = fs.readFileSync(path.join(root, name), "utf8");
  assert(!html.includes("default-decks.js"), name + ": no separate default-deck loader");
  assert(!html.includes("collection=defaults"), name + ": no separate defaults navigation");
}

(async () => {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, "http://localhost");
    const relative = decodeURIComponent(url.pathname).replace(/^\/+/, "") || "index.html";
    const file = path.resolve(root, relative);
    if (!file.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
    fs.readFile(file, (error, data) => {
      if (error) { res.writeHead(404); res.end(); return; }
      res.setHeader("Content-Type", ({
        ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
        ".json": "application/json; charset=utf-8", ".ydk": "text/plain; charset=utf-8"
      })[path.extname(file)] || "application/octet-stream");
      res.end(data);
    });
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const base = "http://127.0.0.1:" + server.address().port;
  let browser;
  const errors = [], attemptedWrites = [], commentRequests = new Set(), deckRequests = new Set();
  let communityUnavailable = false, checked = 0;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1365, height: 1000 }, acceptDownloads: true });
    await context.route("**/*", async route => {
      const request = route.request(), url = new URL(request.url());
      if (request.method() !== "GET") {
        attemptedWrites.push(request.method() + " " + url.origin + url.pathname);
        return route.abort();
      }
      if (url.origin === base) return route.continue();
      if (url.pathname === "/rest/v1/decks") {
        const slug = url.searchParams.get("slug");
        if (slug) deckRequests.add(slug.replace(/^eq\./, ""));
        const records = [...posts, archive].filter(post => !slug || slug === "eq." + post.slug);
        return route.fulfill({ status: communityUnavailable ? 503 : 200, contentType: "application/json", body: JSON.stringify(records) });
      }
      if (url.pathname === "/rest/v1/deck_comments") {
        commentRequests.add((url.searchParams.get("deck_slug") || "").replace(/^eq\./, ""));
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([comment]) });
      }
      return route.abort();
    });
    const page = await context.newPage();
    page.on("pageerror", error => errors.push(error.message));
    page.on("crash", () => errors.push("Browser page crashed"));
    const gridCount = async count => {
      await page.waitForFunction(expected => document.querySelectorAll("#grid > a").length === expected, count);
      assert.equal(await page.locator("#grid > a").count(), count);
    };
    const noSpecialUI = async () => assert.equal(await page.locator(specialUI).count(), 0, "No separate default-profile controls");

    await page.goto(base + "/index.html");
    await page.waitForFunction(() => document.getElementById("statusBadge").textContent === "2229 cards loaded");
    assert.equal(await page.locator("#searchResults .scard").count(), 80, "Fresh builder renders the card search");
    assert.match(await page.locator("#fmtLabel").innerText(), /OCTOBER 2026/);
    assert.equal(await page.getByRole("button", { name: "Deck Library", exact: true }).count(), 1);
    assert.equal(await page.locator("#header a, #header button").filter({ hasText: /20 mazos|20 decks|gu[ií]as|guides|defaults/i }).count(), 0, "No extra default-deck guide button");
    await noSpecialUI();
    await page.getByRole("button", { name: "Deck Library", exact: true }).click();
    await page.waitForURL("**/decks.html");
    await gridCount(21);
    await noSpecialUI();
    assert.equal(await page.locator("#fFormat").inputValue(), "", "Library defaults to All formats");
    assert.match(await page.locator("header").innerText(), /CURRENT FORMAT: OCTOBER 2026/);
    assert.equal(await page.locator("#countText").innerText(), "21 deck(s) found.");
    await page.locator("#fSearch").fill("Harpie");
    await gridCount(1);
    assert.match(await page.locator("#grid > a .title").innerText(), /Harpie/);
    await page.locator("#fSearch").fill(posts[0].author_name);
    await gridCount(20);
    await page.locator("#fSearch").fill("");
    await page.locator("#fArchetype").fill(posts[0].archetype);
    await gridCount(posts.filter(post => norm(post.archetype).includes(norm(posts[0].archetype))).length);
    await page.locator("#fArchetype").fill("");
    const cardSearch = posts[0].main_deck[0].name;
    await page.locator("#fCard1").fill(cardSearch);
    await gridCount([...posts, archive].filter(post => zones.some(zone => post[zone + "_deck"].some(card => norm(card.name).includes(norm(cardSearch))))).length);
    await page.locator("#fCard1").fill("not-a-real-card-fixture");
    await gridCount(0);
    assert(await page.locator("#empty").isVisible());
    await page.locator("#fCard1").fill("");
    await page.locator("#fFormat").selectOption("oct_2026");
    await gridCount(20);
    await page.locator("#fFormat").selectOption("aug_2026");
    await gridCount(1);
    await page.locator("#grid > a").click();
    await page.locator("#page").waitFor({ state: "visible" });
    assert.equal(await page.locator("#dTitle").innerText(), archive.title);
    await noSpecialUI();
    assert(await page.locator("#commentsBox").isVisible());
    assert.match(await page.locator("#previewText").innerText(), /Graveyard|\bGY\b/i, "August profiles retain their own card data");
    archive.format = "feb_2026";
    archive.main_deck = [{ name: "Miracle Fertilizer", qty: 1 }];
    await page.reload();
    await page.locator("#page").waitFor({ state: "visible" });
    assert.equal(await page.locator("#previewName").innerText(), "Miracle Fertilizer");
    assert.match(await page.locator("#previewImg").getAttribute("src"), /44887817/);
    const archivedDownloadPromise = page.waitForEvent("download");
    await page.locator("#exportYDKBtn").click();
    const archivedDownload = await archivedDownloadPromise;
    assert.deepEqual(parseYDK(fs.readFileSync(await archivedDownload.path(), "utf8")).main, [44887817], "February export preserves a card removed in October");

    for (const post of posts) {
      if (process.env.QA_VERBOSE) console.log("Checking normal post: " + post.title);
      const deck = catalog.decks.find(entry => entry.slug === post.slug);
      assert(deck, post.title + ": publication matches catalog");
      assert.match(post.description, /PLAY GUIDE/);
      assert.match(post.description, /SIDE DECK GUIDE/);
      await page.goto(base + "/deck.html?slug=" + encodeURIComponent(post.slug));
      await page.locator("#page").waitFor({ state: "visible" }).catch(async error => {
        error.message = post.title + ": " + await page.locator("#loading").textContent() + "; " + error.message;
        throw error;
      });
      await noSpecialUI();
      assert.equal(await page.locator("#dTitle").innerText(), post.title);
      assert.equal(await page.locator("#dFormatBadge").innerText(), "OCTOBER 2026");
      assert.equal(await page.locator("#mainCount").innerText(), "Main 40");
      assert.equal(await page.locator("#sideCount").innerText(), "Side 15");
      assert.equal(await page.locator("#dDesc").textContent(), post.description, post.title + ": full English guide is the normal description");
      assert.equal(await page.locator("#dDesc").evaluate(el => getComputedStyle(el).whiteSpace), "pre-wrap");
      await page.locator("#readMoreDescBtn").waitFor({ state: "visible" });
      const collapsedHeight = await page.locator("#dDesc").evaluate(el => el.clientHeight);
      await page.locator("#readMoreDescBtn").click();
      assert.equal(await page.locator("#readMoreDescBtn").innerText(), "Show Less");
      assert(await page.locator("#dDesc").evaluate(el => el.classList.contains("expanded")));
      assert(await page.locator("#dDesc").evaluate(el => el.clientHeight > 100 && el.clientHeight >= el.scrollHeight - 1), post.title + ": expanded guide is not clipped");
      assert(await page.locator("#dDesc").evaluate((el, previous) => el.clientHeight > previous, collapsedHeight));
      await page.locator("#readMoreDescBtn").click();
      assert.equal(await page.locator("#readMoreDescBtn").innerText(), "Read More");
      assert(await page.locator("#commentsBox").isVisible(), post.title + ": regular comments remain enabled");
      await page.locator("#commentList .commentItem").waitFor({ state: "visible" });
      assert.equal(await page.locator("#commentCount").innerText(), "1 comment");
      assert.equal(await page.locator("#commentList .commentText").textContent(), comment.comment);
      assert.equal(await page.locator("#commentList .commentText b").count(), 0, "Comment markup remains escaped");
      assert(await page.locator("#commentSubmit").isEnabled());
      const downloadPromise = page.waitForEvent("download");
      await page.locator("#exportYDKBtn").click();
      const download = await downloadPromise;
      const expectedFilename = post.title.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9 _-]/g, "").trim().replace(/\s+/g, "_") + ".ydk";
      assert.equal(download.suggestedFilename(), expectedFilename);
      const exported = parseYDK(fs.readFileSync(await download.path(), "utf8"));
      for (const zone of zones) {
        const expected = deck[zone + "_deck"].flatMap(card => Array(card.qty).fill(Number(card.password)));
        assert.deepEqual(multiset(exported[zone]), multiset(expected), post.title + ": exported " + zone + " card multiset");
      }
      await page.locator("#builderBtn").click();
      await page.waitForURL("**/index.html");
      await page.waitForFunction(() => document.getElementById("cntMain").textContent === "40");
      assert.equal(await page.locator("#cntSide").innerText(), "15", post.title + ": Side import");
      assert.equal(await page.locator("#cntExtra").innerText(), String(total(deck.extra_deck)), post.title + ": Extra import");
      assert.equal(await page.locator("#validation").innerText(), "Deck OK", post.title + ": October legality");
      checked++;
    }
    for (const post of posts) {
      assert(deckRequests.has(post.slug), post.title + ": loaded through ordinary community API");
      assert(commentRequests.has(post.slug), post.title + ": loaded ordinary comments");
    }

    communityUnavailable = true;
    await page.goto(base + "/decks.html");
    await page.waitForFunction(() => document.getElementById("loading").textContent.includes("Error loading decks"));
    assert.match(await page.locator("#loading").innerText(), /Error loading decks: Supabase error 503/);
    assert.equal(await page.locator("#grid > a").count(), 0, "No static fallback when community API fails");
    await noSpecialUI();
    communityUnavailable = false;
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(base + "/decks.html");
    await gridCount(21);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "Mobile library must not overflow horizontally");
    await page.goto(base + "/deck.html?slug=" + encodeURIComponent(posts[0].slug));
    await page.locator("#page").waitFor({ state: "visible" });
    await page.locator("#readMoreDescBtn").waitFor({ state: "visible" });
    await page.locator("#readMoreDescBtn").click();
    assert.equal(await page.locator("#dDesc").textContent(), posts[0].description);
    assert(await page.locator("#commentsBox").isVisible());
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "Mobile profile and full guide must not overflow horizontally");
    await noSpecialUI();
    await page.goto(base + "/deck.html?slug=missing-normal-post-fixture");
    await page.locator("#notfound").waitFor({ state: "visible" });
    assert(!(await page.locator("#page").isVisible()));
    assert.deepEqual(attemptedWrites, [], "Browser test never attempts external or local writes");
    assert.deepEqual(errors, [], "No unhandled browser exceptions");
    console.log("PROFILES_UI PASS: " + checked + " ordinary posts, full descriptions, comments, YDK multisets, builder imports, archive, filters, DB outage and mobile");
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
