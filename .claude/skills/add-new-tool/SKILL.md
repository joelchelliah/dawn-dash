---
name: add-new-tool
description: Step-by-step checklist for adding a new tool/page to dawn-dash (registry entry, page file with PageHead, sitemap, verification). Use when adding a new top-level tool to the site.
---

# Add a new tool

The tool registry makes this a two-file change plus assets. Follow the checklist in order.

## 1. Registry entry

Add an entry to `TOOL_REGISTRY` in `src/shared/config/toolRegistry.ts`, filling every `ToolDefinition` field (id, path, title, ogTitle, description, shortDescription, metaDescription, ogDescription, ogImage, logoImage, landingImage, navIcon; `legacyPaths` only if old URLs must redirect). Look at an existing entry for the copy style and URL conventions:

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
