# Spec: replace or pin `next-pwa`

**Status: not started. This is an investigation brief, not an implementation plan.** The deliverable
of the first pass is a recommendation, agreed with the user, before any dependency is swapped.

**Not urgent.** The site works today. This is about removing a class of silent failure, not fixing a
live outage.

## Why this exists

While verifying task 7 of `specs.md` (the Cardex card-art cache), the service worker turned out not
to be installing **at all** in production — and probably had not been since the Next 15 upgrade.

`next-pwa` globs `.next/` to build its precache manifest and picked up
`_next/dynamic-css-manifest.json`: a Next 15 build file that exists on disk but **404s over HTTP**.
Workbox precaching is atomic, so that one bad response aborted the whole install and took every
`runtimeCaching` rule with it. The only symptom was a console error
(`bad-precaching-response`) that nobody was looking for.

Patched in `next.config.ts` with:

```ts
buildExcludes: [/dynamic-css-manifest\.json$/],
```

That fixes the symptom. It does not fix the cause: a build-tool plugin that predates the framework
version it is running against, and that fails **silently and totally** when they disagree.

## Verified facts (checked 2026-08-01 — re-check before acting)

| Fact | Value |
|---|---|
| Installed / latest `next-pwa` | **5.6.0** — the installed version *is* the newest, so there is nothing to upgrade to |
| Last published | **2022-08-23** — ~4 years stale |
| Declared peer range | `next >=9.0.0` — so npm raises no warning against Next 15 |
| Next version here | **15.3.6** |
| Bundled Workbox | `workbox-webpack-plugin ^6.5.4` (Workbox 7 is current) |

The permissive `>=9.0.0` peer range is the trap: nothing in the toolchain flags the mismatch, and
the failure mode is a runtime console error rather than a build error.

### Candidates (publish dates only — capabilities not yet assessed)

| Package | Latest | Last published |
|---|---|---|
| `@serwist/next` | 9.5.12 | **2026-07-22** — actively maintained |
| `@ducanh2912/next-pwa` | 10.2.9 | 2024-09-18 |
| roll our own (Workbox directly, or a hand-written worker) | — | — |

`@serwist/next` is the community successor to `next-pwa`; `@ducanh2912/next-pwa` was the earlier
fork by the same author. Neither has been evaluated here.

## What the investigation has to establish

1. **Is the risk worth acting on at all?** The `buildExcludes` patch may hold indefinitely. Weigh
   that against the next Next.js upgrade silently breaking the worker again. A cheap middle option:
   keep `next-pwa` and add a **guard** (below), which removes the *silence* without a migration.
2. **What do we actually use?** Only `dest`, `disable`, `buildExcludes` and two `runtimeCaching`
   buckets. That is a small surface, which makes migration cheaper than it might look — confirm by
   reading `next.config.ts` rather than assuming.
3. **What must not regress.** The `card-artwork` (1500 entries, `/images/icons/**`) and
   `external-images` (100) split from task 7a, the 10-day expiry, `CacheFirst`, and the
   first-match-wins ordering. Offline support relies on these.
4. **Migration cost for the chosen candidate** — config shape, whether it needs an app-router setup,
   whether the worker source becomes a file we maintain, and whether `disable`-in-development has an
   equivalent.
5. **Does it fix the actual problem?** A maintained plugin tracking current Next is the point. Verify
   the candidate does not have its own version of the precache-glob issue.

## The cheap win — ✅ DONE (2026-08-02)

**Making this class of failure loud** was worth doing regardless of the decision above, so it is
already implemented: `scripts/check-service-worker.js`, run via `npm run check-sw`.

It reads `public/sw.js`, extracts every precache entry, and fails with a non-zero exit if any of them
resolves to a file that does not exist. Checked against disk rather than over HTTP so it needs no
running server and can gate CI. Verified both ways: it passes on the current build (101 entries) and
fails on a worker with the original `dynamic-css-manifest.json` entry reinjected.

Two things this does **not** cover, worth knowing if the migration goes ahead:

- It parses the manifest as `url:"…"` pairs and maps `/_next/static/**` to `.next/static`, everything
  else to `public/`. A different plugin will likely emit a different shape — re-check the script if
  the worker generator changes.
- `npm run verify` still cannot catch this class of bug: it does not build, and the plugin is
  disabled in development. The guard has to run after `npm run build`.

## Constraints

- Verify against `npm run build && npm start`. `npm run dev` proves nothing here — the plugin is
  disabled in development, so there is no worker to test.
- After any change, confirm in DevTools → Application: the worker reaches *activated and running*
  with no console error, and both cache buckets appear and fill.
- The root `CLAUDE.md` *PWA & Performance* section documents the two-bucket setup verbatim. If the
  config shape changes, that text changes with it.
