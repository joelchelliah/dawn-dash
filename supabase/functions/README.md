# Supabase Edge Functions

Deno functions that own the **talents** data in Supabase. (Events and artwork are
owned by local Node scripts in [`scripts/`](../../scripts) instead — different pipeline.)

**Talents are the only Supabase data the app actually reads** — Skilldex is its sole consumer.
Cardex fetches cards live from the Blightbane API, so the `Cards` table and `sync-cards` below
are dormant: nothing in the frontend reads what that function writes.

| Function                         | Purpose                                                   | Status                            |
| -------------------------------- | --------------------------------------------------------- | --------------------------------- |
| [`sync-talents`](./sync-talents) | Insert new talents from the Blightbane API into `Talents` | Active                            |
| [`sync-cards`](./sync-cards)     | Same, for `Cards`                                         | **Not in use** for the time being |
| [`talents-name`](./talents-name) | Public read-only talent-name lookup endpoint              | Active                            |

Deploy with `npx supabase functions deploy <name>`, then run from the Supabase Dashboard →
Edge Functions. All three have `verify_jwt = true`, so curl needs a valid JWT — the Dashboard
is simpler.

---

## Syncing talents

### The short version

```bash
npm run sync-talents-preflight        # what will be inserted, and any follow-up work
npm run backup-talents -- <password>  # dump the tables before changing anything
```

Then run the `sync-talents` function from the Supabase Dashboard, post-process the new rowsx
by hand, and bump the frontend cache version. Details below.

### How the sync behaves

[`sync-talents/index.ts`](./sync-talents/index.ts) is an **insert-only, additive** sync:

1. Fetches the full talent list from `cards-codex?category=10` — no `exp` filter, so always
   _all_ talents.
2. For each talent, fetches `/card/<name>?talent=true` for flavour text, prereqs, and events.
3. Reads existing `blightbane_id`s from `Talents` and inserts **only ids not already present**.

**It deliberately never updates existing rows.** This is by design, not a limitation: after
import we post-process talents by hand in Supabase, and re-fetching an existing talent from
Blightbane would overwrite that work. The trade-off is that upstream edits to talents we
already have (a reworked description, a changed prereq) are **not** picked up — if you need
one of those, update the row manually.

Because it only ever inserts, re-running it is safe.

### New rows arrive deliberately incomplete

The function hardcodes these fields empty, to be filled in manually after review:

| Field                      | Populated by                                             |
| -------------------------- | -------------------------------------------------------- |
| `requires_classes`         | manual                                                   |
| `requires_energy`          | manual                                                   |
| `requires_cards`           | manual                                                   |
| `event_requirement_matrix` | manual                                                   |
| `verified`                 | manual — set `true` once the row has been post-processed |

Everything else (`name`, `description`, `flavour_text`, `tier`, `expansion`, `events`,
`requires_talents`, `required_for_talents`) comes from the API.

`verified = false` is the marker for "imported but not yet reviewed". Note the column default
is `true`, so only sync-inserted rows start out unverified.

**Why this matters for Skilldex:** [`talentsResponseMapper.ts`](../../src/codex/utils/talentsResponseMapper.ts)
sorts the tree by exactly these manual fields — `isRootTalent` requires empty class/energy/talent
requirements. So a freshly synced talent with no `requires_talents` lands under
**"No Requirements"** until you fill its requirements in. That post-processing _is_ the real work.

### Steps

1. **Preflight.** `npm run sync-talents-preflight` — diffs Blightbane against production and
   lists what will be inserted, plus any frontend follow-up. Read-only; safe to run any time.

2. **Back up the tables.** `npm run backup-talents -- <db-password>`. Cheap insurance given
   step 3.

3. **Run the function.** Supabase Dashboard → Edge Functions → `sync-talents` → Run.

   > ⚠️ **Never pass `clear: true`.** It deletes every row before inserting, destroying all
   > manual post-processing. There is no way to re-derive it except from a backup.

4. **Post-process the new rows:**

   ```sql
   select * from "Talents" where verified = false;
   ```

   Fill in `requires_classes`, `requires_energy`, `requires_cards`,
   `event_requirement_matrix`, then set `verified = true`.

5. **Bump the talents cache version** — `CACHE_VERSION` in
   [`codexTalentsStore.ts`](../../src/codex/utils/codexTalentsStore.ts). Without this, returning
   users keep a stale tree for up to 24h.

6. **Verify.** `npm run verify`, then check `/skilldex` in the dev server.

### What `npm run sync-talents-preflight` checks

[`scripts/sync-talents-preflight.js`](../../scripts/sync-talents-preflight.js) is a read-only preflight. It reports:

- **New talents** that the edge function will insert (id, name, tier, expansion).
- **Unknown expansion indices / tiers** — see the next section.
- **Orphaned rows**: in the database but no longer in Blightbane. The sync never removes
  anything, so these linger; worth checking whether they were renamed or reworked.
- **Unverified rows**: still awaiting manual post-processing.

It reads production via the anon key from `.env.local`. RLS grants anon `SELECT` only, which is
why the script can't do the insert itself — that needs the service role key, hence the edge
function. `--json` gives machine-readable output.

### What `npm run backup-talents` does

[`scripts/backup-talents.js`](../../scripts/backup-talents.js) automates the `pg_dump` +
cleanup pipeline from [SEED_DATA.md](../SEED_DATA.md): dumps `Talents`, `Cards` and `metadata`,
strips the `\restrict` lines psql can't load, prepends the DROP block so the dump can be
re-imported over existing tables, and appends the role grants that `--no-privileges` omits.

```bash
npm run backup-talents -- <db-password>                              # timestamped backup
npm run backup-talents -- <db-password> --out supabase/seed-data.sql # refresh the seed data
```

- The password is a required argument — it isn't stored in the repo. It's the Postgres password
  from your password manager. If it's lost, reset it under Supabase Project
  Settings → Database. The script passes it via `PGPASSWORD` rather than in the connection
  string, so it doesn't show up in `ps`.
- Needs `pg_dump` on PATH (`brew install postgresql`).
- By default it writes to `supabase/backups/` (gitignored — these contain production data) and
  leaves the checked-in `seed-data.sql` untouched. Use `--out` to refresh that once you've
  verified the dump, per SEED_DATA.md.
- It refuses to write a dump containing zero `Talents` rows.
- After writing, it **compares the dump's shape against the checked-in `seed-data.sql`** and
  reports per table: added/removed columns and the row-count delta. The two files are never
  byte-identical (new rows arrive constantly), so this checks structure, not content — it's there
  to catch a dump that's structurally valid but quietly wrong (a table that failed to dump, a
  dropped column, half the rows missing). Added columns and higher row counts are reported as
  normal; a **missing table**, a **column present in the seed but absent from the dump**, or a
  **>10% row drop** get flagged for review. Nothing here is fatal — it's information, since any
  of them can also be a legitimate schema change.

> **Note:** the direct `db.<project-ref>.supabase.co` host that SEED_DATA.md documents no longer
> resolves — Supabase retired direct IPv4 connections. The script uses the pooler URL from
> `supabase/.temp/pooler-url` (written by `npx supabase link`) instead, where the username is
> `postgres.<project-ref>` rather than plain `postgres`.

### New expansions and tiers

A new game expansion _usually_ just adds talents under existing expansion indices, in which
case there's no frontend work. But if it introduces a **new expansion index**, the Skilldex
card-set filter silently hides those talents and labels them `-`. The preflight flags this.
To fix, add the index to:

- `CardSetFilterOption` — [`src/codex/types/filters.ts`](../../src/codex/types/filters.ts)
- `defaultCardSetFilterValueMap`, `indexMap`, `indexToValueMap` —
  [`useCardSetFilters.ts`](../../src/codex/hooks/useSearchFilters/useCardSetFilters.ts)
- `KNOWN_EXPANSIONS` — [`scripts/sync-talents-preflight.js`](../../scripts/sync-talents-preflight.js)

Then bump `TALENTS_CACHE_VERSION` in
[`codexFilterStore.ts`](../../src/codex/utils/codexFilterStore.ts) if the tree shape changes or if there is any danger of the new data causing an error.

Same idea for a **new tier** beyond 6: `TierFilterOption`,
[`useTierFilters.ts`](../../src/codex/hooks/useSearchFilters/useTierFilters.ts), and
`MAX_KNOWN_TIER` in the script.

### Other things to keep in mind

- **Hand-curated exception lists.** `ACTUALLY_EVENT_ONLY_TALENTS` and `UNAVAILABLE_TALENTS` in
  [`talentsMappingValues.ts`](../../src/codex/constants/talentsMappingValues.ts) are maintained by
  hand. New event-only talents need adding there.
- **The mapper fails loudly, not gracefully.** It throws on recursive prereq loops and on
  multiple event-requirement sets. If bad prereq data comes in, Skilldex breaks rather than
  degrades — so check the dev server before deploying.
- **Expansion `0`** means monster/event talents; it's remapped in the response mapper and is why
  `isRootTalent` excludes it.
- **Blightbane calls tier `rarity`.** The function maps `talent.rarity → tier` on insert.
