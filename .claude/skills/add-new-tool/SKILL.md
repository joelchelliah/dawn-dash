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

## 2. Page file

Create `pages/<id>.tsx` following the existing pattern (see `pages/cardex.tsx`): a dynamic import of the feature component from `src/<feature>/`, rendered together with `<PageHead toolId="<id>" />`.

## 3. Feature code

Put the feature's components/hooks/utils under `src/<id>/` (or an existing feature dir if it belongs there), with an `index.tsx` entry.

## 4. Sitemap

Add the tool's URL to the hardcoded list in `scripts/generate-sitemap.js` — the registry does NOT feed the sitemap.

## 5. Verify (the registry consumers pick the tool up automatically — confirm it)

- Landing page shows the new NavItem with image and short description.
- Header side menu shows the link with icon, and the active state highlights on the new page.
- `useNavigation().navigateTo('<id>')` works (no code change needed — it reads the registry).
- If `legacyPaths` was set: the redirects work (`next.config.ts` generates them from the registry).
- Page `<head>` has correct title/meta/OG tags (rendered by `PageHead` from the registry).

## 6. Run the `verify-changes` skill

`npm run verify` and, since this touches `pages/` and possibly `next.config.ts` behavior, `npm run build`.
