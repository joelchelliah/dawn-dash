---
name: add-new-tool
description: Step-by-step checklist for adding a new tool/page to dawn-dash (registry entry, page file with PageHead, sitemap, verification, launch and Google Search Console registration). Use when adding a new top-level tool to the site, or when launching one that was built behind `unlisted: true`.
---

# Add a new tool

The tool registry makes this a two-file change plus assets. Follow the checklist in order.

## 1. Registry entry

Add an entry to `TOOL_REGISTRY` in `src/shared/config/toolRegistry.ts`, filling every `ToolDefinition` field (id, path, title, ogTitle, description, shortDescription, ogDescription, ogImage, logoImage, landingImage, navIcon; `legacyPaths` only if old URLs must redirect). Look at an existing entry for the copy style and URL conventions:

- `ogImage`: `https://www.dawn-dash.com/og-image-<id>.png`
- `logoImage`: `https://www.dawn-dash.com/logo-<id>.png`
- `landingImage`: `/landing-<id>.webp`
- `navIcon`: a URL from `src/shared/utils/imageUrls.ts`

Add the corresponding image assets to `public/`.

**Set `unlisted: true` while the tool is still being built** (the default for a new tool). It keeps the tool out of the landing page and side menu, and makes `PageHead` emit `noindex, nofollow` instead of the canonical link and JSON-LD, so Google won't index it. The path still works for anyone with the URL, and OG tags are still served — a link pasted into Discord or Slack renders its preview as usual, which is what makes it shareable with testers. Remove the flag at launch (see step 7).

## 2. Page file

Create `pages/<id>.tsx` following the existing pattern (see `pages/cardex.tsx`): a dynamic import of the feature component from `src/<feature>/`, rendered together with `<PageHead toolId="<id>" />`.

## 3. Feature code

Put the feature's components/hooks/utils under `src/<id>/` (or an existing feature dir if it belongs there), with an `index.tsx` entry.

## 4. Sitemap

Skip this while the tool is `unlisted` — an unindexed page has no business in the sitemap. At launch, add the tool's URL to the hardcoded list in `scripts/generate-sitemap.js`; the registry does NOT feed the sitemap, which is exactly what keeps unlisted tools out of it.

## 5. Verify (the registry consumers pick the tool up automatically — confirm it)

While `unlisted: true`:

- Landing page and header side menu do **not** show the tool (`getListedTools()` filters it out).
- Navigating directly to `/<id>` still renders the page.
- Page `<head>` has `<meta name="robots" content="noindex, nofollow">`, and **no** canonical link or JSON-LD block.
- Title/meta/OG tags are otherwise correct (rendered by `PageHead` from the registry).
- `useNavigation().navigateTo('<id>')` works (no code change needed — it reads the registry).
- If `legacyPaths` was set: the redirects work (`next.config.ts` generates them from the registry).

Once `unlisted` is removed:

- Landing page shows the new NavItem with image and short description, and the hover description resolves.
- Header side menu shows the link with icon, and the active state highlights on the new page.
- `<head>` has the canonical link and JSON-LD, and no `robots` meta.

## 6. Run the `verify-changes` skill

`npm run verify` and, since this touches `pages/` and possibly `next.config.ts` behavior, `npm run build`.

## 7. Launch checklist (when the tool is ready to go public)

1. Remove `unlisted: true` from the registry entry.
2. Add the tool's URL to `scripts/generate-sitemap.js`, then regenerate: `node scripts/generate-sitemap.js` (there is no npm script for it).
3. Re-run step 5's "once `unlisted` is removed" checks and `npm run verify`.
4. Confirm the images from step 1 actually exist in `public/`. `logoImage` is the easy one to miss: it feeds only the JSON-LD, which `PageHead` emits **only when `unlisted` is false** — so a missing file has no effect at all until the moment of launch. `npm run build && npm run check-sw` catches it, since a `public/` image that 404s breaks the whole precache manifest.
5. Deploy, then do step 8.

## 8. Register the page with Google Search Console (manual, after deploying)

Not a code change, and it can only be done against the live site. Search Console UI, `dawn-dash.com` property.

**Don't regenerate the sitemap here** — step 7 already committed the URL. Re-running the generator only restamps every `lastmod` to today, which is a large diff for no benefit. What's missing is only telling Google the file changed.

1. **Check the deployed page is indexable** before submitting anything: fetch `https://www.dawn-dash.com/<id>` and confirm the served HTML has `<link rel="canonical">` and **no** `noindex`. A build-output check isn't a substitute — a stale CDN copy or a deploy that missed the registry change only shows up here, and submitting a `noindex` page gets it recorded as excluded, which is slower to undo than to avoid.
2. **Sitemaps → resubmit `sitemap.xml`.** Prompts a re-read; Google otherwise recrawls on its own schedule, which can take days. Discovered-URL count ticks up once it processes the file, not immediately.
3. **URL Inspection → paste the full URL → Request Indexing.** This is the step that matters for a single new page; the sitemap alone just queues it for eventual discovery. If the inspection reports `noindex`, stop and go back to step 1 — production is serving something other than what was built.
4. `public/robots.txt` needs no change (it's `Disallow:`, i.e. allows everything, and points at the sitemap). Worth one look only because a blocked path makes step 3 fail confusingly.
5. Re-check in a few days. "Discovered – currently not indexed" is normal for a new page on a small site — resubmitting repeatedly doesn't help.

**Use the `www` host.** Canonicals, sitemap `<loc>` entries and `robots.txt` all use `https://www.dawn-dash.com`; inspecting the bare `dawn-dash.com` reports on a different URL than the one being indexed.
