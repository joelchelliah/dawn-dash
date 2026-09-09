# Spec: launch Booty publicly

**Status: tasks 1–2 COMPLETED. Next up: task 3 (generate the three missing images).**

Booty is functionally complete and shipped behind `unlisted: true` — reachable at `/booty`, hidden
from the landing page and side menu, `noindex, nofollow`. This spec covers everything between that
state and a public launch. No feature work: the tool itself is done.

## Decisions already made

- **`unlisted: true` is the launch switch.** Dropping it from the registry entry is what adds Booty
  to the landing grid and side menu and swaps `noindex` for a canonical link + JSON-LD. Nothing else
  gates visibility, so it goes **last** among the launch tasks — see task ordering.
- **No `legacyPaths`.** The three codex tools carry `/codex/*` redirects because they moved; `/booty`
  is a new URL with nothing to redirect from. Leave it absent unless a pre-launch URL was shared.
- **Registry copy is final.** `description`, `shortDescription`, `ogDescription`, `ogTitle` were
  written and tightened in commits `4c14e71`, `fc32196`, `e74739f`. Don't re-litigate them here; the
  About paragraph (task 4) is new prose, not a rewrite of those.
- **Image dimensions are fixed by existing assets**, not open to choice — see task 3.

## How to work through this spec

### What to read first

- **Root `CLAUDE.md`** — Working Style (progress cadence, the dev server is the user's to run),
  Tool Registry (the `unlisted` contract and why sitemap tool URLs are hardcoded), PWA & Performance
  (Workbox precaching is atomic — one 404 entry disables the entire worker).
- **`src/codex/CLAUDE.md`** — the treasure invariants at the bottom (`data/treasure-pools.json` owns
  composition, `constants/treasurePools.ts` owns copy, player-facing notes live in
  `TreasurePool/poolNotes.tsx`). Task 8 edits this file's *header*; leave those invariants alone.
- **`src/shared/config/toolRegistry.ts`** — the `ToolDefinition` comments spell out what each copy
  field is for and its length budget.

Constraints that shape this work, so they're visible without opening every file:

- **`getListedTools()`, not `TOOL_REGISTRY`**, is what the landing page and side menu iterate. That's
  why the launch is a one-field change, and why the landing grid renders a broken tile the moment
  `unlisted` is dropped if the images aren't there yet.
- **Sitemap tool URLs are hardcoded in `scripts/generate-sitemap.js` on purpose** — that's what keeps
  an unlisted tool out of the sitemap. Don't "fix" it by generating them from the registry.
- **The og image is 2400×1260 because `PageHead` hardcodes those numbers** as `og:image:width` /
  `og:image:height`. A differently-sized file makes the meta tags lie and crops badly in embeds.

### Where to stop

**Tasks 1–7 may be chained without pausing.** They touch separate concerns (two import fixes in one
file, three binary assets, one JSX block, one script array, one README section, one registry line) and
none can bury a mistake in another. **Task 7 must come last of the seven**: it is the launch switch,
and it depends on task 3's images existing.

**Pause after task 7 for the pre-launch verification pass (tasks 10–13).** That's the point where the
tool is publicly visible and everything is checkable at once in the browser.

**Tasks 8–9 are doc-only and have no visible effect** — don't mistake them for broken steps.

Mark each task `COMPLETED` in this file as it's finished, so a fresh context can tell what's done
from the spec alone.

### How it gets verified

- **`npm run verify`** — required after every task, and task 1 is *specifically* fixing it.
- **`npm run build && npm run check-sw`** — required after task 3, because new `public/` images enter
  the precache manifest, and after task 7, since the registry feeds `next.config.ts` redirects.
- **`npm run sync-events`** regenerates the sitemap; confirm `/booty` appears in `public/sitemap.xml`.
- **Visually, in the user's dev server** (the user runs it, not the agent). States to compare, since
  "looks fine" on one routinely misses the others:
  - Landing page: desktop hover panel (shows `description`) **and** mobile card (shows
    `shortDescription`) — they never co-render, so both need looking at.
  - Side menu: Booty nav link present, in registry order, with correct hover/active styling.
  - About modal: Booty section between Eventmaps and Scoring, divider pattern intact.
  - Booty page: mobile / tablet / desktop; treasure modal open with long pool lists and with cards
    both with and without hints; pool notes rendering above and below the tag sections; both panels'
    loading and error states.

### Which docs change with the work

| File | Section | Why it's affected |
|---|---|---|
| `README.md` | new Booty section between Eventmaps and Scoring | task 6 |
| `src/codex/CLAUDE.md` | title, opening line, Key files | says "three tools" / "Cardex, Skilldex, and Eventmaps"; `booty.tsx` and the two treasure JSONs are unlisted (task 8) |
| `CLAUDE.md` (root) | Project Architecture, Main Features, Data Synchronization | says "**five tools**" and lists five; `sync-treasures.js` isn't mentioned (task 9) |

New invariant worth recording once implemented (task 9): **`scripts/data/treasures.json` comes from
the external treasure-extraction tool and is pasted in manually** (gitignored, `sync-treasures` fails
fast without it) — the same ownership story as `events.json`. This is already stated in
`src/codex/CLAUDE.md`; the root file's Data Synchronization section is where it's missing.

A change that contradicts a documented invariant gets raised with the user, not quietly rewritten.

### Comment style

The non-obvious *why*, in a line or two. No restating the code, no narrating the change's history.

---

## Blocking tasks

### 1. Fix the failing `npm run verify` — COMPLETED

`npm run verify` **currently fails.** Two `import/order` errors in
`src/codex/components/ResultsPanels/TreasureCardsPanel/TreasureModal/index.tsx:17-18` — the
`GradientLink` import was appended below the local imports instead of joining the `@/shared` group.

```
17:1  error  There should be at least one empty line between import groups
18:1  error  `@/shared/components/GradientLink` import should occur before import of `@/speedruns/components/ClassEnergy`
```

`npm run lint:fix` resolves both. This is an uncommitted working-tree change, so nothing is broken on
the branch — but it must be green before anything else is called done.

**Verify:** `npm run verify` passes.

**Outcome:** `GradientLink` now sits in the `@/shared` group; `npm run verify` passes end to end
(format, lint, type-check, tests).

### 2. Fix the cross-feature import — COMPLETED

`TreasureModal/index.tsx:7` imports `ClassEnergy` from `@/speedruns/components/ClassEnergy` — the
**only** `codex → speedruns` import in the codebase (verified by grep). The root `CLAUDE.md` treats
that direction as a layering violation: it documents the inverse rule for `shared/` ("`shared/` must
not import speedruns types") and speedruns wraps shared helpers rather than the reverse.

Promote `ClassEnergy` to `@/shared/components/` and update both consumers.

Grouped with task 1 deliberately: the import-order error is on the adjacent line of the same file,
so both changes touch one region. Re-run `npm run lint:fix` after moving the import — relocating it
to the `@/shared` group is what satisfies the `import/order` rule from task 1.

**Verify:** `npm run verify`; grep confirms zero `@/speedruns` imports under `src/codex`; the class
energy orbs still render in the treasure modal.

**Outcome:** `git mv`'d to `src/shared/components/ClassEnergy/` (history preserved), and its
`getEnergyImageUrl` import repointed from the speedruns wrapper to `@/shared/utils/energyImages`.
That was the component's only speedruns dependency, so the move leaves nothing behind.

Two findings worth recording:

- **The speedruns wrapper was never reachable through this component.** `ClassEnergy`'s prop is typed
  `CharacterClass`, and the wrapper only adds the `All`/`Hybrid` branches — which are
  `SpeedRunSubclass` members, not `CharacterClass` ones. Both consumers pass a plain
  `CharacterClass`, so the shared lookup covers every case the component can actually receive.
- **`speedruns/utils/images.ts` stays.** Five other speedruns components (`ControlRadioButton`,
  `SubclassButton`, `ChartLegend`, `Slider`, and `getClassImageUrl`'s callers) still pass
  `SpeedRunSubclass` values through it, so the wrapper is not dead code — don't remove it as
  follow-up cleanup.

The SCSS moved unchanged: `@use 'index' as *` resolves through the `includePaths` entry for
`src/styles` in `next.config.ts`, so it behaves identically from `shared/`.

**Still needs a visual check** (task 10's pass, or whenever the dev server is next up): the energy
orbs in the treasure modal, and the two orbs flanking the speedruns chart footer — the shared
`getEnergyImageUrl` returns the same URLs for all `CharacterClass` values, so this is a
regression check rather than an expected change.

### 3. Generate the three missing images

All three are referenced by the registry; **none exist in `public/`.** Dimensions are dictated by the
existing assets, and by `PageHead` for the og image:

| File | Size | Format | Notes |
|---|---|---|---|
| `public/og-image-booty.png` | **2400×1260** | PNG | Hardcoded in `PageHead` as `og:image:width`/`height`. Also used as the README thumbnail (task 6) |
| `public/landing-booty.webp` | **800×420** | WebP | Matches `landing-eventmaps` / `skilldex` / `scoring` exactly |
| `public/logo-booty.png` | **1200×1200** | PNG | All six existing logos are 1200×1200 RGB |

`logo-booty.png` is the easy one to miss: `logoImage` feeds only the JSON-LD `image`, which
`PageHead` renders **only when `unlisted` is false** — so a missing file has no effect today and
becomes live the instant task 7 lands.

**Verify:** `npm run build && npm run check-sw`. The built service worker precaches every `public/`
image by name, and because Workbox precaching is atomic a single 404 silently disables the whole
worker including all runtime image caching.

### 4. Write the Booty paragraph for the About section

In the `InfoModal` in `src/shared/components/Header/SideMenu/index.tsx` (~lines 190–240). Insert in
registry order — **after Eventmaps, before Scoring**:

```tsx
{getInfoTitle('booty')}

<p className={cx('info-last-paragraph')}>
  {/* new prose here */}
</p>

<div className={cx('info-divider')} />
```

`getInfoTitle` is registry-driven (reads `tool.navIcon` and `tool.title` via `getTool`), so no icon
wiring is needed — the `BootyImageUrl` nav icon comes along automatically.

Two things to get right:

- **The divider pattern.** Each tool's paragraph is followed by an `info-divider` **except the last**
  (Speedruns, which also has two `<p>`s — the first plain, the last `info-last-paragraph`). Adding a
  Booty section mid-list means Booty gets a divider and Speedruns still has none.
- **Voice.** These paragraphs address readers who already know the game and are longer/warmer than the
  registry's `description`. Match that register rather than pasting the registry copy.

**Verify:** open the About modal from the side menu; check Booty sits between Eventmaps and Scoring
with correct spacing and dividers above and below.

### 5. Add `/booty` to the sitemap

`scripts/generate-sitemap.js` lists tool URLs manually — the comment there says exactly this ("Add a
tool here when it launches"). Add:

```js
{
  loc: `${BASE_URL}/booty`,
  lastmod: new Date().toISOString().split('T')[0],
  changefreq: 'weekly',
  priority: '0.8',
},
```

`0.8` matches Cardex, Skilldex and Scoring. Keep the hardcoded list hardcoded.

**Verify:** `npm run sync-events` (regenerates the sitemap), then confirm `/booty` is present in
`public/sitemap.xml` and the URL count went up by one.

### 6. Update the README

Add a `## 🪎 Booty` section between Eventmaps and Scoring, following the existing shape: blurb →
`**Check it out**:` link → og-image thumbnail linking to the live page.

```md
[![Booty](./public/og-image-booty.png "Click to visit Booty")](https://dawn-dash.com/booty)
```

Two pre-existing bugs worth fixing in the same pass: the **Eventmaps and Scoring thumbnails both use
alt text `Eventmaps`** (`[![Eventmaps](./public/og-image-scoring.png ...)]`).

**Verify:** README renders correctly on GitHub — in particular that the new thumbnail resolves
(depends on task 3).

### 7. Remove `unlisted: true` — the launch switch

Delete the `unlisted: true` line from the booty entry in `src/shared/config/toolRegistry.ts`.

This single change:

- adds Booty to the landing page grid (`getListedTools()`),
- adds it to the side menu nav (same),
- swaps `noindex, nofollow` for a `<link rel="canonical">` in `PageHead`,
- enables the JSON-LD block, which reads `logoImage`.

**Do this after task 3.** Without the images the landing grid renders a broken tile and the JSON-LD
points at a 404.

**Verify:** `npm run build` (the registry feeds generated redirects in `next.config.ts`), then
visually: landing page desktop **hover panel** and **mobile card** separately, side menu ordering,
and page source for `/booty` showing the canonical link and JSON-LD with no `noindex`.

## Documentation tasks

**No visible effect** — these are doc-only and must not be mistaken for broken steps.

### 8. Update `src/codex/CLAUDE.md` for four tools

- Title: `# src/codex/ — Cardex, Skilldex, and Eventmaps` → include Booty.
- Opening line: "This directory hosts **three** tools" → four, adding **Booty** (`booty.tsx`).
- Key files: add `data/treasure-cards.json` and `data/treasure-pools.json` — static, regenerated by
  `scripts/sync-treasures.js`, **never hand-edit** (same phrasing as the `event-trees.json` entry).

The treasure **invariants** at the bottom of that file are already thorough — leave them as they are.

### 9. Document Booty in the root `CLAUDE.md`

- Project Architecture: "**five tools**" → six, and add Booty to the tool list.
- Main Features: add a sixth numbered entry — `**Booty** (/booty, src/codex/)` — a breakdown of every
  treasure card and how to acquire it, rendered from static `treasure-cards.json` /
  `treasure-pools.json`, with card details joined live from the Blightbane API via `useCardData`.
- Data Synchronization → Local Node scripts: add `sync-treasures.js`, noting that
  `scripts/data/treasures.json` comes from the external extraction tool and is pasted in manually
  (gitignored; the script fails fast without it), and that it splits into the two `src/codex/data`
  JSONs. Also note `sync-treasures` is part of `npm run sync-all`.

## Pre-launch verification pass

### 10. Visual check across states

Mobile / tablet / desktop. Treasure modal open with long pool lists and with cards both with and
without hints. Pool notes above **and** below the tag sections. Both panels' **loading and error**
states — `useCardData` fetches live from Blightbane, so a failed fetch is a real path users hit.

The user runs the dev server and does the comparison.

### 11. Confirm the dev-only drift warnings are silent

A clean console on the current data set confirms every join resolves:

- `findUnmappedPools` — a JSON pool with no display mapping
- `findUnknownRewards` — a `contains` category not yet checked to read well as a tag

  (both in `TreasurePoolsPanel`)
- `enrichTreasureCards` — a treasure whose `id` doesn't match any `blightbane_id`
- `resolveEvents` — a treasure event name absent from `event-trees.json`

  (both in `utils/treasureHelper.ts`)

Note `POOL_NOTES` is a `Record<PoolId, PoolNotes>`, so a pool missing copy fails to **compile** —
that's deliberate, and why there's no runtime warning for it.

### 12. Check the `🪎` og emoji renders in a Discord embed

`ogTitle` is `'🪎 Booty'` — the nazar amulet is an unusual glyph. Discord is the primary sharing
target and it's the one thing that can't be fixed after the link is out. Check the embed shows the
emoji, the og image, and `dawn-dash.com/booty` as the site name.

### 13. Check the `card-artwork` cache bucket sizing

Booty renders treasure artwork from `/images/icons/**`, sharing the 1500-entry `card-artwork` bucket
with Cardex. Treasure counts are small (~27KB of card data), so this is very likely fine — confirm in
DevTools rather than assuming, and don't resize the bucket without evidence: keeping `card-artwork`
and `external-images` separate is what stops a large Cardex session evicting the rest of the site's
images, and the specific pattern must stay **first** since Workbox uses the first match.
