# Maintaining the NeoGoat Visual Card Pool

`cardpool.html` is a static gallery served alongside the existing platform. Visitors need only a browser; there is no NeoGoat Pro installation, account, build step or application dependency. The implementation adds files and leaves the Deck Builder, Card Search, source card JSON and Vercel routing unchanged.

## Files and behavior

- `cardpool.html`, `assets/cardpool.css`, `assets/cardpool.js`: responsive gallery, combined filters, 36-card pagination and enlarged card details.
- `assets/cardpool-core.js`: classification, deduplication, filtering, status mapping and image candidates, shared with the data tests.
- `data/cardpool-gallery.json`: active version and available format JSON paths.
- `data/cardpool-classification.json`: two documented classic-card exceptions. See [the data audit](cardpool-data-audit.md) for counts and evidence.
- `integration/blogger-cardpool.html`: the insertable Blogger block.
- `integration/blogger-cardpool-page.html`: the supplied full Blogger page with that block inserted; historical explanations and existing Duelingbook links are preserved.

Four independent checkboxes select Goat Pool, OCG Exclusives, Structure Deck Additions and Extra Pool. Initially the three addition groups are checked and Goat Pool is unchecked, preserving the All Added Cards view with an empty search. Select all shows the complete pool; Clear asks the visitor to select at least one category. Group counts and the unique selection total are computed from the selected format, while the filtered match count and pagination remain separate. Every category includes all statuses; Forbidden cards display `0`, `Forbidden` and `Not playable`. The page reads names, printed passwords, types, effects, pool origins and status from the selected project JSON. Source content is inserted as text, not interpreted as HTML. Selected groups form a union keyed by normalized password. If the same password appears under multiple source pools, those memberships are combined only when the remaining card metadata and banlist status agree; conflicting records still fail visibly. The existing documented classic reprint classification remains unchanged.

Images reuse the sources and fallback approach of [NeoGoat Card Search](https://neogoatformat.blogspot.com/p/console.html): YGOPRODeck card images through the wsrv.nl cache, then direct YGOPRODeck alternatives, with normalized numeric and eight-digit password forms. Thumbnail requests prefer `cards_small` and use bounded WebP dimensions; enlarged images prefer `cards`. Exhausted alternatives show an explicit missing-image placeholder. No artwork files are copied into the project.

Only the current page's 36 tiles are rendered, with lazy image loading. Browser HTTP caching applies to artwork, and successful image URLs are remembered during the visit. JSON requests revalidate browser caches (`cache: "no-cache"`); the parsed active format is then reused in memory for searches, filters and repeat selection. A new visit reloads the configuration and revalidates the data.

## Selecting a future format

Edit `data/cardpool-gallery.json`, whose initial contents are:

```json
{
  "activeFormatId": "oct_2026",
  "classificationFile": "data/cardpool-classification.json",
  "formats": [
    {
      "id": "oct_2026",
      "label": "October 2026",
      "cardsFile": "data/formats/oct_2026/cards_oct_2026.json"
    }
  ]
}
```

Append a uniquely identified format with its actual complete project JSON and set `activeFormatId` to that ID. Paths must stay on the same origin under `/data/`. This gallery configuration is intentionally independent of the builder's `data/config.json`, so gallery changes do not alter the existing builder.

Keep `password`, `pool`, `type` and `ban_status` in the supported schema. Unknown classifications or statuses fail visibly with a retry option instead of implying legality. New totals are computed automatically; do not enter category counts or a fixed Extra Pool size. Review newly added cards for classic reprints and add only documented exceptions to the small classification file. The existing two exceptions preserve original card data in the details panel.

## Deployment and Blogger insertion

Deploy the branch containing these added files through the repository's existing Vercel workflow. The intended address, [neogoat-platform.vercel.app/cardpool.html](https://neogoat-platform.vercel.app/cardpool.html), becomes available only after that branch is deployed. A local implementation or preview does not publish the production URL.

In Blogger, edit the **Card Pool** page in **HTML view**. Copy all of `integration/blogger-cardpool.html` immediately after the closing `</ul>` of the two October banlist links, and immediately before:

```html
<h3>The Card Pool contains:</h3>
```

Do not replace the historical explanations or existing card-list links. Alternatively, `integration/blogger-cardpool-page.html` contains the complete supplied page with the block already inserted. Compare it against any subsequent Blogger edits before replacing the full page body. Use either the block or the complete page, not both.

The block includes a visible link to open Vercel directly and an iframe using `?embed=1`. Origin-checked messages resize the iframe to the current page's content, shrink it after filtering and keep card details within the visible parent viewport. The parent page provides the ordinary scrolling surface. If the host strips the script or the referrer is unavailable, the fixed-height iframe remains scrollable and the direct link remains available. Deploy first, then verify the saved Blogger page; Blogger was not edited during this task.

## Checks

From the repository root, these checks require Node.js and no package installation:

```sh
node tests/cardpool-data.test.js
node tools/build-october-2026.js --check
node tests/formats.test.js
node tests/ydke.test.js
node tests/default-profiles.test.js
node tests/pack-viewer.test.js
```

The optional gallery DOM regression uses jsdom installed outside the checkout. In PowerShell:

```powershell
npm --prefix ../qa-deps install jsdom --no-audit --no-fund
$env:NODE_PATH = (Resolve-Path ../qa-deps/node_modules).Path
node tests/cardpool-ui.test.js
```

The data test checks classification, frozen October counts and copy limits, all 16 category combinations, overlapping group membership, excluded cards, duplicate handling, filters, padded passwords and image candidate safety. The DOM test checks independent checkbox changes, Select all/Clear, initial browsing, unique counts, pagination, combined filters, details, safe text rendering, image failures, format-load failure/retry, in-memory reuse and the iframe message protocol. Its simulated layout does not replace a real-browser check.

For this implementation, the dependency-free checks above and the gallery DOM checks passed. Browser QA used the Codex in-app browser at 1280px desktop and 390px/320px phone widths. A cross-origin local embedding (localhost parent, 127.0.0.1 child) confirmed that iframe document height matched its viewport height, avoiding an inner page scrollbar; filtering shrank a measured iframe from 6,079px to 1,220px. Card details and closing with Escape or Enter were checked. These are browser viewport checks, not tests on physical Android/iPhone devices or native Safari. The deployed Blogger page was not tested because publication remains a separate step.

The pre-existing `tests/profiles-ui.test.js` is optional and requires Playwright plus Chromium; it was not run because those dependencies were unavailable. It is unrelated to the new gallery's jsdom test.

The November 4 checkbox update passed the data and jsdom regressions, including all 16 combinations and padded-password overlaps. No new browser layout verification was performed for that update; the earlier viewport checks above describe the original gallery.
