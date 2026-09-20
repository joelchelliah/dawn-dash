# Spec: Shareable URLs for Booty cards

Booty's treasure and weapon modals hold the substantive content — acquisition flags, source lists,
related events, special conditions — but they are pure local state with no URL representation. There
is no way to link someone to a specific treasure or weapon. Every other content-bearing tool on the
site can be linked into: Eventmaps has `/eventmaps/[event]`, Cardex has its filter state.

**Status: COMPLETE.** Task 0 and Tasks 1–3 and 5 are COMPLETED. Tasks 4 and 6 were rejected (see below).

The end state: `/booty/flying_carpet` loads Booty with the Flying Carpet modal already open, and a
link to it previews in Discord with the card's own artwork and description.

## Decisions already made

These were settled during scoping. Don't re-litigate them mid-implementation.

- **A route segment, not a query param.** `/booty/flying_carpet`, not `/booty?card=flying_carpet`.
  The reason is OG tags and it is not a matter of taste — see _Why not a query param_ below.
- **Name in the URL, not id.** `flying_carpet`, not `77316`. Shareable, readable, and it survives a
  Blightbane id change. The lookup is over 41 entries, so a linear `.find` is fine — **do not** build
  a module-scope `Map` for this. (The map rule in `CLAUDE.md` is about the ~3100-entry
  `card-artwork.json` and ~3000-entry card data; 41 is not that.)
- **Reuse `normalizeEventNameForUrl`.** It already exists at
  `src/codex/hooks/useEventUrlParam.ts:76` and is exactly `name.toLowerCase().replace(/\s+/g, '_')`.
  Verified against the real data: all 14 treasure and 27 weapon names are plain ASCII
  (`/[^A-Za-z0-9 '-]/` matches none of them), so every name round-trips with no escaping. Don't write
  a second normalizer.
- **One shared param namespace for both panels.** `/booty/staff_of_thunder`, not separate
  `/booty/treasure/...` and `/booty/weapon/...` routes. See _The Staff of Thunder overlap_.
- **The modal renders over the full Booty page.** This is not "a page per card" in any meaningful
  sense — see _What actually gets built_.

Settled with the user once implementation started:

- **The Treasure Cards panel owns the overlapping URL.** `staff_of_thunder` opens the treasure modal;
  `WeaponList` sits the URL out. Recorded as `BOOTY_CARD_URL_OWNER` in `utils/bootyCardUrl.ts`.
- **The OG description comes from the static JSON, not Blightbane.** Upstream now emits a
  `description` on every treasure and weapon entry, so Task 0 (below) pulls it through the sync
  scripts and types. It is the same text Blightbane serves **minus a trailing keyword list**
  (`Grounded.`, `Unique.`, `Chain.` — 25 of the 41 cards differ this way), which is what makes it the
  better OG copy and why the **modals deliberately keep reading Blightbane's**: those keywords are
  gameplay information a player acts on.
- **Task 6 is dropped.** The card URLs stay out of the sitemap — shareable and previewable, just not
  submitted for indexing.
- **There are 40 URLs, not 41.** 14 treasures + 27 weapons − Staff of Thunder, counted once.

- **Task 4 is rejected.** The cold-load scroll-into-view was built and rolled back — too much
  machinery for a nice-to-have, and it didn't survive closing the modal. See Task 4 below.

## How to work through this spec

### What to read first

- **Root `CLAUDE.md`** — Working Style. Most relevant here: **the dev server is the user's to run**.
  Several tasks below are verified visually; say what to look at and wait, never start `npm run dev`.
- **`src/codex/CLAUDE.md`** — four invariants bear on this work:
  - **`booty.tsx` owns the single `useCardData()` call**, shared via `BootyCardDataContext`. The
    panels must not call the hook themselves. This constrains where URL-param resolution can live —
    see _The mount-timing trap_.
  - **Every entry in `data/special-weapons.json` carries its own full details**, so a card that is
    both a weapon and a treasure (currently only Staff of Thunder) is rendered from that file alone
    and is **not** looked up in `treasure-cards.json`. Such a card is deliberately shown twice, once
    per panel, each reading its own data. This is the documented design, not a bug to fix.
  - **Artwork resolution goes through the module-scope `Map`s in `@/shared/hooks/useCardImageSrc`**,
    passing `category`. The OG image work in Task 5 needs an artwork URL and must use this, not a
    hand-built URL string.
  - **Blightbane serves a valid placeholder webp with HTTP 200 for non-existent icons**, so
    `onError` never fires for a wrong artwork value. A missing name or `artwork: null` is the only
    reliable miss signal. Task 5 must branch on that, not on a load failure.
- **`src/codex/hooks/useEventUrlParam.ts`** — the whole file. It is the pattern being mirrored, and
  it already solves two problems this work hits: the `router.isReady` guard (line 26) and the
  `lastProcessedParamRef` de-duplication (line 23).
- **`pages/eventmaps/[event].tsx`** and **`src/codex/components/EventMapHead/index.tsx`** — the
  SSG + per-entity-`<Head>` precedent, to copy structurally.
- **`scripts/generate-sitemap.js`** — note the comment at its `urls` array: tool URLs are listed
  manually **on purpose**, so an `unlisted` tool stays out of the sitemap. Task 6 touches this file;
  read that comment before deciding anything.

### Where to stop

**Tasks 1–3 may be chained.** They are the mechanical core (route, hook, wiring) and none of them is
individually observable — Task 1 in particular has no visible effect at all and must not be mistaken
for a broken step.

**Pause for confirmation after Task 3 and Task 5.** Both are where it becomes possible to be subtly
wrong in a way that is easy to miss:

- Task 3 is the first point where the feature visibly works, and where shallow-routing mistakes show
  up as a remount (losing scroll and card data) rather than an error.
- Task 5 changes what third parties see, and a wrong OG image is invisible locally — it only shows
  up when someone pastes a link into Discord.

At each pause: finish the task, get it into a state the user can look at, say what changed and which
states to check, mark the task **COMPLETED** in this spec, and wait. **The user spins up the dev
server, not the agent.**

### How it gets verified

- **`npm run verify`** after every task. Required before any task counts as done.
- **`npm run build`** after Tasks 1, 5 and 6 — they touch `pages/` and build-time generation. Task 1's
  build output is itself the verification: it should report ~41 new static pages under `/booty/[card]`.
- **`npm run check-sw`** after Task 1, per the root `CLAUDE.md` rule about `pages/` changes reaching
  the service worker. A bad precache entry silently disables the whole worker.
- **Visual, in the user's dev server**, for Tasks 3 and 5. Specific states to compare, because "looks
  fine" on one of them routinely misses the others:
  - Cold load of `/booty/flying_carpet` (a **treasure**, above the fold) — modal open on arrival.
  - Cold load of `/booty/arcane_bow` (a **weapon**, below the fold, and behind the `hasCardData`
    gate) — modal open on arrival, and the row visible behind it after closing.
  - Cold load of `/booty/staff_of_thunder` — the overlap card. Exactly one modal, not two.
  - Cold load of a **nonsense** URL, e.g. `/booty/not_a_card` — 404, per `fallback: false`.
  - Click a card on `/booty` → URL updates, no page flash, **scroll position unchanged**.
  - Close the modal → back to `/booty`, page not remounted (card data not refetched — watch the
    network tab, or the loading bar not reappearing).
  - Browser **back/forward** across several card selections.
- **OG tags** (Task 5): `npm run build && npm start`, then
  `curl -s localhost:3000/booty/flying_carpet | grep -i 'og:'` — the tags must be in the **served
  HTML**, not applied after hydration. That distinction is the entire point of the route-segment
  decision, so verifying it any other way verifies nothing.

### Which docs change with the work

- **`src/codex/CLAUDE.md`** — add an invariant once implemented. Candidates, grepped for while
  scoping: the _Booty_ bullets near `booty.tsx owns the single useCardData() call` are where URL
  ownership belongs. The new invariant worth recording is **where the selection state lives** (the
  URL, not the list components) and **why the lists resolve from `router.query` rather than from page
  props** — see _The mount-timing trap_, which is the non-obvious part.
- **`scripts/generate-sitemap.js`** — Task 6, with the deliberate-hardcoding comment updated if card
  URLs are added.
- **Root `CLAUDE.md`** — the Booty entry under _Main Features_ describes it as rendering three
  panels; if card URLs land, that entry should mention the per-card routes, as the Eventmaps entry
  mentions `pages/eventmaps/[event].tsx`.
- **This spec** — mark tasks COMPLETED as they land.

A change that contradicts a documented invariant gets raised with the user rather than quietly
rewritten. The `useCardData` single-fetch invariant is the one most at risk here.

### Comment style

The non-obvious _why_, in a line or two. The three things worth a comment in this work, because
nothing about the code makes them evident:

- Why the lists read `router.query` rather than page props (both paths must work; shallow routing
  doesn't re-run `getStaticProps`).
- Why `shallow: true` is load-bearing (it is what keeps this one page instead of real navigation).
- Why the sitemap does or doesn't get the card URLs, whichever way Task 6 goes.

No restating the code, no narrating the history of the change.

---

## Background: why a query param cannot work

This was the original idea (`/booty?card=flying_carpet`) and it is worth recording why it was
rejected, so it isn't proposed again.

**Scrapers don't run JavaScript.** Discord, Twitter and Facebook fetch the URL and parse the raw
bytes they get back. `EventmapHead` works because `getStaticProps` bakes the event into the HTML at
build time — the `<meta>` tags are literally in the file on disk before anyone requests it. A
`?card=` param only reaches `<Head>` via `router.query` in the browser, so the served HTML still
carries Booty's generic tags. React updates them after hydration, long after the scraper has left.

**Query params don't reach the server in a static build.** `/booty?card=flying_carpet` and
`/booty?card=chalice_of_blood` are the same static file. `?card=` isn't part of what Next
pre-renders, and there is no per-request server step to vary it. This is structural, not a missing
config flag.

This project is **not** `output: 'export'` — it deploys to Vercel with `getStaticProps` /
`getStaticPaths`, so `getServerSideProps` is technically available. It was still rejected: putting
`/booty` behind SSR would server-render the page on every request for every visitor, purely to serve
scrapers, on a page that is otherwise fully static.

The remaining query-param option is **edge middleware that sniffs the User-Agent** and serves a
tag-only response to bots. It works and plenty of SPAs do it, but it is UA-dependent, it means two
code paths serving different HTML to different clients, and it is far more machinery than a
`[card].tsx` that reuses a pattern already in this repo. Only worth revisiting if the URL shape were
ever fixed by something external.

## What actually gets built

**One page, 41 URLs into it.** `pages/booty/[card].tsx` renders the same `<Booty />` component every
time; only the `<Head>` contents differ per card. This mirrors Eventmaps exactly — there is one
Eventmaps page and ~200 URLs into it.

```tsx
export default function BootyCardPage({ card, cardUrlParam }: Props) {
  return (
    <>
      <BootyCardHead card={card} cardUrlParam={cardUrlParam} />
      <Booty /> {/* the same component pages/booty.tsx renders */}
    </>
  )
}
```

"41 pre-rendered pages" means 41 HTML files on disk differing only in their `<meta>` tags — a build
artifact, not 41 things to maintain. One `[card].tsx` and one `BootyCardHead` are written; the rest is
`getStaticPaths` output. The existing build already emits ~200 event HTML files from one `[event].tsx`.

The reader's journey from a shared link:

1. Discord scrapes `/booty/flying_carpet` and gets that file's baked-in tags — card artwork, card
   description.
2. Click → Booty loads with the Flying Carpet modal open.
3. Close the modal → `router.push('/booty', undefined, { shallow: true })`. URL cleans up, page never
   unmounts.
4. Click another card → URL becomes `/booty/chalice_of_blood`, still shallow, still the same mounted
   component.

Steps 3 and 4 are what make it feel like one page rather than navigation between pages. `shallow: true`
swaps the URL without re-running data fetching or remounting, which on this page also means **not
refetching ~3000 cards**. Eventmaps already relies on this at `useEventUrlParam.ts:51`.

## Research findings

### The existing modal state is already the right shape

Both lists drive their modal from a single `selectedId: number | null`:

- `components/BootyPanels/TreasureCardsPanel/TreasureList/index.tsx:16`
- `components/BootyPanels/SpecialWeaponsPanel/WeaponList/index.tsx:15`

Each resolves that id against its own data with a `.find`. So URL-driven opening is "derive this
value from the URL instead of from a click" — no restructuring of the modals, and `CardModal` /
`TreasureModal` / `WeaponModal` are untouched by this work.

### Eventmaps derives from `router.query`, not from page props — copy that

**This is the most important finding and it corrects the obvious assumption.**
`pages/eventmaps/[event].tsx` computes an `event` in `getStaticProps` and passes it to
`EventmapHead` — but `<Events />` **takes no props at all** (`src/codex/events.tsx:33`,
`function Events(): JSX.Element`). It derives the selected event entirely client-side from
`router.query` via `useEventUrlParam`.

That split is deliberate and worth preserving:

- **`getStaticProps` feeds only the `<Head>`.** It runs at build time, for scrapers and the cold load.
- **The component resolves from `router.query`.** One code path for both the cold load and shallow
  client-side navigation.

The alternative — passing the card down as a prop — breaks on shallow routing, because `shallow: true`
does not re-run `getStaticProps`, so a client-side navigation to `/booty/flying_carpet` would leave
the prop stale while the URL says otherwise. Following the Eventmaps split avoids the problem
entirely rather than having to handle it.

### The mount-timing trap

`booty.tsx:55` gates two of the three panels behind the card fetch:

```tsx
;<TreasureCardsPanel />
{
  hasCardData && (
    <>
      <SpecialWeaponsPanel />
      <CardPoolsPanel />
    </>
  )
}
```

So on a cold load of `/booty/arcane_bow`, **the weapons list does not exist yet** — for the first
seconds there is nothing to match the param against.

This dictates where resolution lives. Reading the param **inside each list component** handles it for
free: the list mounts with the param already in the URL and resolves it on its first render, whenever
that happens to be. A single top-level "apply the param once" effect in `booty.tsx` would fire before
`WeaponList` exists and silently do nothing — a bug that only reproduces on a cold load of a weapon
URL, which is precisely the case these shared links create.

Note this does **not** conflict with the single-`useCardData()` invariant: the lists would read
`router.query`, not call the data hook. `booty.tsx` keeps sole ownership of the fetch.

### The Staff of Thunder overlap

The only name collision across the two datasets, found by normalizing all 41 names:

```
treasure: [{"id":77316,"name":"Staff of Thunder","cat":"BasicAttack"}]
weapon:   [{"id":77316,"name":"Staff of Thunder","cat":"BasicAttack"}]
```

Same `id`, same card. Per `src/codex/CLAUDE.md`, this is deliberate: `special-weapons.json` carries
full details for every entry, so the card is rendered twice — once per panel, each from its own data
file — and the `isTreasure` flag that marked the overlap upstream was dropped because nothing branched
on it.

It is therefore **not a genuine ambiguity**, just one card with two homes. But it is a real hazard for
naive per-list matching: if both lists independently match `staff_of_thunder`, **two modals open,
stacked**. Task 3 must pick an owner. Suggested rule, to be confirmed with the user: the Treasure
Cards panel wins, since it sits at the top of the page and is the one that reports sync state. Whatever
is chosen needs a comment, because the tie-break is not derivable from the data — both entries look
equally valid.

A route segment is what makes this a one-line rule rather than a URL-design problem: `?treasure=` vs
`?weapon=` prefixing would have been needed under the query-param approach, giving one card two URLs.

### Scroll on cold load

`/booty` is a long page and the weapons list sits well below the fold. Opening a modal from a cold
load without scrolling means closing it drops the reader at the top of the page with no idea where the
card lives.

This matters **more here than it does for Eventmaps**, because these URLs exist to be shared: for a
link arriving from Discord, the cold load is the common case rather than the rare one. It motivated
Task 4, which was built and then **rejected** — the reasoning above is sound, but the implementation
cost was out of proportion to it and the scroll didn't survive closing the modal, which was the
payoff. See Task 4 for what was tried.

### OG images could be better than Eventmaps gets

Treasure and weapon cards have real artwork resolvable through `useCardImageSrc`, so `og:image` can be
the actual card art. `EventmapHead` already handles this exact shape — it switches
`og:image:width` / `og:image:height` between `60`/`60` for event artwork and `2400`/`1260` for the
tool's OG image, and omits `twitter:card: summary_large_image` when using the small square. Copy that
branching rather than reinventing it.

The miss signal must be a missing name or `artwork: null`, **never** an image load failure — per
`CLAUDE.md`, Blightbane returns HTTP 200 with a placeholder webp for non-existent icons.

---

## Tasks

### Task 0 — Pull `description` through the sync — **COMPLETED**

Added ahead of the original task list, because Task 5's OG copy reads it.

- `description` added to `CARD_FIELDS` in `scripts/sync/sync-treasures.js` and to `WEAPON_FIELDS` in
  `scripts/sync/sync-weapons.js`, and to `TreasureCard` / `SpecialWeapon` in `types/`.
- Both syncs re-run, so `data/treasure-cards.json` and `data/special-weapons.json` now carry it.
- **The modals were left on `cardDetails.description` (Blightbane's)** — see the decision above.

### Task 1 — The static route — **COMPLETED**

Add `pages/booty/[card].tsx`, structurally mirroring `pages/eventmaps/[event].tsx`.

- `getStaticPaths` over the combined treasure + weapon names (14 + 27 = 41), normalized with
  `normalizeEventNameForUrl`. De-duplicate — Staff of Thunder appears in both lists, so a naive concat
  yields 42 paths with one duplicate, which Next will reject.
- `fallback: false`, so unknown card URLs 404.
- `getStaticProps` resolves the param to its card for the `<Head>` only.
- Render `<Booty />` with no props, exactly as the eventmaps page renders `<Events />`.
- Move `pages/booty.tsx`'s existing content as needed so `/booty` itself keeps working unchanged.

Use the existing `PageHead toolId="booty"` for now; `BootyCardHead` arrives in Task 5.

**No visible effect.** The route exists and 404s are gone, but no modal opens yet and the OG tags are
still generic. This is expected — don't chase it as a bug.

Verify: `npm run verify`, `npm run build` (expect ~41 new static pages), `npm run check-sw`.

### Task 2 — The URL-param hook — **COMPLETED**

Add `src/codex/hooks/useBootyCardUrlParam.ts`, modelled on `useEventUrlParam` but simpler — one query
key, one route, no index sentinel like `ALL_EVENTS_INDEX`.

```ts
const { cardNameInUrl, selectCardAndUpdateUrl, clearCardInUrl } = useBootyCardUrlParam()
```

- Guard on `router.isReady` — on a static page the query is empty on first render
  (`useEventUrlParam.ts:26`).
- `selectCardAndUpdateUrl(name)` → `router.push(`/booty/${normalized}`, undefined, { shallow: true })`.
- `clearCardInUrl()` → `router.push('/booty', undefined, { shallow: true })`, and only if not already
  there — `useEventUrlParam.ts:56` guards this to avoid losing focus, and the same reasoning applies.
- Reuse `normalizeEventNameForUrl`; do not write a second normalizer.

Consider whether `lastProcessedParamRef` is needed. It exists in `useEventUrlParam` to stop duplicate
processing, but that hook pushes into external state via `setSelectedEventIndex`. If the lists derive
their selection **during render** from `cardNameInUrl` (recommended, and what makes Task 3's mount
timing work), there is no effect to de-duplicate and the ref is unnecessary. Don't copy it reflexively.

**No visible effect** — nothing consumes the hook yet.

Verify: `npm run verify`.

### Task 3 — Wire both lists to the URL — **COMPLETED**

**PAUSE AFTER THIS TASK.**

In `TreasureList` and `WeaponList`, replace `useState<number | null>` with derivation from
`cardNameInUrl`:

```ts
const selected = cardNameInUrl
  ? treasures.find((t) => normalizeEventNameForUrl(t.treasureDetails.name) === cardNameInUrl)
  : undefined
```

`onSelect` calls `selectCardAndUpdateUrl(name)`; the modal's `onClose` calls `clearCardInUrl()`.

Apply the Staff of Thunder tie-break here, with a comment. Confirm the chosen owner with the user —
the suggestion is the Treasure Cards panel.

Note `CardList`'s `onSelect` currently passes an **id**; it will need the name, or the list can map id
→ name before calling. Prefer whichever keeps `CardsList` unchanged, since it is shared by both panels.

Verify: `npm run verify`, then the full visual list under _How it gets verified_ — every cold-load
case, the click/close round trip, and browser back/forward. Watch specifically that closing a modal
does **not** refetch card data, which would mean the page remounted and `shallow` isn't working.

### Task 4 — Scroll the selected row into view on cold load — **REJECTED**

Built, tried in the browser, and rolled back. The code is **not** in the tree; this section records
why, so it isn't proposed again.

**What it did.** `useBootyCardUrlParam` gained an `isCardFromInitialLoad` flag (a ref capturing the
card in the URL on the router's first ready render, true only while the URL still holds that card, so
clicks never qualified). Both lists passed the selected id down to `CardsList` as a new
`scrollIntoViewId` prop; the matching `CardListRow` took a ref and called
`scrollIntoView({ behavior: 'auto', block: 'center' })`, deferred a frame and latched to fire once.

**Why it was dropped.** Two reasons, the second decisive:

- **It didn't deliver the thing it existed for.** The scroll landed, but closing the modal returned
  the page to the top anyway — and "closing the modal leaves the reader where the card lives" was the
  entire justification. Left as-is it scrolls a page the reader can't see behind a modal, then throws
  the position away at the one moment it was supposed to matter. Fixing _that_ means restoring scroll
  across the `router.push('/booty')` that closes the modal, which is more router-level machinery
  again.
- **The cost/benefit is wrong.** Three files touched, a new prop threaded through the shared
  `CardsList` (used by both panels, for a case that applies to one row of one of them), a flag on the
  URL hook, a ref in the row, and a deferred frame — all for a nice-to-have. The feature works
  without it: the link opens the right modal, which is what a shared link is for.

**If it is ever revisited**, note the two traps that cost time here, because neither is obvious:

- The first attempt cancelled its own scroll. The effect's cleanup called `cancelAnimationFrame`, and
  `CardsList` re-renders while the card fetch settles, so the cleanup killed the pending frame before
  it fired. `hasScrolledRef` already guarantees a single run — the cleanup was redundant _and_ wrong.
- Scroll-position-on-close is the actual feature, not scroll-position-on-open. Any revisit should
  start there; the open-side scroll is worthless on its own.

### Task 5 — Per-card OG tags — **COMPLETED**

`src/codex/components/BootyCardHead/index.tsx` now renders per-card `<title>`, `description`, `og:*`,
`twitter:*`, canonical and JSON-LD (`WebPage` + `BreadcrumbList`), structurally mirroring
`EventmapHead` including its `60`/`60` vs `2400`/`1260` width branching and conditional
`twitter:card`.

- **Artwork** resolves through `getCardImageSrc(name, null)` — the plain function, not the hook, since
  this runs outside React's render for a `<Head>`. `null` is the miss signal, per the placeholder-webp
  invariant. No numeric `category` is passed: it lives on the live `CardData`, not the static JSON, and
  all 40 booty names resolve by name alone (verified against `card-artwork.json`).
- **The OG description is built from the card's own fields, not its description.** This reverses the
  earlier decision recorded above. Every one of the 41 descriptions carries HTML (`<b>`, `<br>`), and
  31 of them carry value tokens (`[damage:5]`, `|#5+[damageBonus]#|`, `([myGold])`) that read as
  sentences only beside the modal's icons and styled numbers. Stripped to plain text for a meta tag
  they read as broken. The text is built with the modals' own exported `getCardSubtitle`, so the two
  never drift.
- **Task 0 was undone.** With nothing reading it, `description` was removed from the source JSONs and
  from `CARD_FIELDS` / `WEAPON_FIELDS` / `TreasureCard` / `SpecialWeapon`. It was never needed even
  under the original plan — the modals were deliberately left on Blightbane's copy for the keyword
  list, so the OG description was its only prospective consumer.
- **`rarity` replaced it in the source data.** Upstream now emits a display _name_ (`"Legendary"`),
  not `CardData.rarity`'s numeric index, which is what lets `getStaticProps` use it — the live card
  data is unreachable at build time. Cross-checked before switching anything over: all 41 ids resolve
  on the live `cards-codex` payload and every static rarity matches its numeric counterpart.
  `getCardSubtitle` now takes the static name in both modals and the head; `CardsList` rows and
  `CardModal`'s border keep `cardDetails.rarity`, since they need the number for
  `RarityBorderedArtwork` and the `--${slug}` class names. Widening that shared component to accept
  either shape was tried and reverted — it is shared with Cardex, which is legitimately numeric, so
  the branch would have bought nothing.

Verified against the **prerendered HTML** in `.next/server/pages/booty/*.html` rather than a running
server — those 40 files are exactly what a scraper receives, and unlike a `npm start` check they don't
collide with the user's dev server on port 3000. All 40 carry their own tags; spot-checked a treasure,
a weapon, the overlap card and a `Utility`-typed weapon.

`npm run verify`, `npm run build` (40 booty pages) and `npm run check-sw` (103 precached URLs resolve)
all pass.

### Task 6 — Sitemap — **DROPPED**

Raised with the user, who declined: 40 pages differing only in modal content is the thin-content risk
this task existed to weigh, and the URLs work as shared links without being indexed. The hardcoded
tool URLs in `scripts/generate-sitemap.js` are untouched, and the file needs no comment change since
nothing about its deliberate hardcoding changed.

<details>
<summary>Original task text</summary>

#### Task 6 — Sitemap (decide, then act)

Read the deliberate-hardcoding comment in `scripts/generate-sitemap.js` first.

Adding 41 card URLs is mechanically trivial — the script already does exactly this for ~200 event
URLs. But it is a **real decision about whether these should be indexed individually**, not a
mechanical follow-on: 41 near-identical pages differing only in modal content is the kind of thing
that can read as thin content to a search engine. Eventmaps sets the precedent for saying yes, since
each event page has substantial unique content; whether a treasure modal clears the same bar is the
user's call.

Raise it with the user rather than deciding unilaterally. If yes, follow the event-URL pattern and
keep the hardcoded tool URLs untouched.

Verify: `npm run build`, then inspect `public/sitemap.xml`.

</details>
