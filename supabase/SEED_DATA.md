# Seed Data / Database Backups

`supabase/seed-data.sql` is a complete dump of the production `Talents`, `Cards`, and `metadata`
tables. It serves two purposes: seeding a local Supabase for development, and restoring
production in a disaster.

> **Only `Talents` is live data.** Skilldex is the sole reader of Supabase; Cardex fetches cards
> straight from the Blightbane API, so the `Cards` table is dormant and dumped only for
> completeness.

> **Creating a backup is scripted — you don't need to follow any manual steps.**
>
> ```bash
> npm run backup-talents -- <db-password>
> ```
>
> [`scripts/backup-talents.js`](../scripts/backup-talents.js) runs `pg_dump`, strips the
> `\restrict` lines, prepends the DROP block, and appends the role grants — the whole pipeline
> that used to be done by hand here. See
> [supabase/functions/README.md](./functions/README.md#what-npm-run-backup-talents-does) for its
> options.
>
> This file now covers only what the script doesn't do: **verifying** a dump and **importing**
> one. The manual `pg_dump`/`sed` recipe it replaced is in git history if you ever need it.

## Prerequisites

- **Database password**: the Postgres password, from your password manager.
  If lost, reset it under Supabase Project Settings → Database.
- **`pg_dump` / `psql`**: `brew install postgresql`

> **Note:** the direct `db.<project-ref>.supabase.co` host this guide used to document no longer
> resolves — Supabase retired direct IPv4 connections. Use the pooler connection string from the
> dashboard (Project Settings → Database → Connection pooling), where the username is
> `postgres.<project-ref>` rather than plain `postgres`. The backup script reads this
> automatically from `supabase/.temp/pooler-url`.

## Creating a new backup

```bash
# Writes a timestamped file to supabase/backups/ (gitignored).
# The checked-in seed-data.sql is left alone.
npm run backup-talents -- <db-password>
```

### Verifying the dump

The script already does most of this for you: it refuses to write a dump with zero `Talents`
rows, reports the row counts, and **compares the dump's shape against the checked-in
`seed-data.sql`** — flagging missing tables, columns that disappeared, and row counts that
dropped by more than 10%. Read that output first; the checks below are for going deeper.

```bash
BACKUP=supabase/backups/<the-file-it-just-wrote>.sql

# Full column-level diff of one table, if the script flagged something
diff <(grep -A 20 'CREATE TABLE public."Talents"' supabase/seed-data.sql) \
     <(grep -A 20 'CREATE TABLE public."Talents"' "$BACKUP")
```

Other spot checks:

```bash
# Should list CREATE TABLE for Cards, Talents, and metadata
grep "^CREATE TABLE" "$BACKUP"

# Should be empty — these break psql imports
grep '\\restrict\|\\unrestrict' "$BACKUP"

# Schema sanity check
grep "event_requirement_matrix" "$BACKUP" | head -2

# Permissions must be present, or the anon role can't read the restored tables
grep "GRANT USAGE ON SCHEMA" "$BACKUP"
```

### Testing it against a local Supabase

Do this before promoting a dump to `seed-data.sql`:

```bash
npx supabase stop
npx supabase start

psql "postgresql://postgres:postgres@localhost:54322/postgres" -f "$BACKUP"

psql "postgresql://postgres:postgres@localhost:54322/postgres" \
  -c 'SELECT COUNT(*) FROM "Talents";' \
  -c 'SELECT COUNT(*) FROM "Cards";'
```

Expected as of the last update: **~385 talents**, **~1740 cards**. Then `npm run dev` and check
that `/cardex` and `/skilldex` render.

### Promoting it to the seed data

Once verified, move the file you tested into place — don't re-run the script, so that the bytes
you verified are the bytes you commit:

```bash
mv "$BACKUP" supabase/seed-data.sql
```

(`npm run backup-talents -- <password> --out supabase/seed-data.sql` writes there directly, but
that gives you an untested dump in the working tree.)

## Using a backup

### For local development

```bash
npx supabase start
psql "postgresql://postgres:postgres@localhost:54322/postgres" -f supabase/seed-data.sql
```

**Note:** `supabase db reset` alone is not sufficient — you must run the `psql` import too.

### For production disaster recovery

> ⚠️ **DANGER: this DROPs and recreates the production tables, deleting all current data**
> — including any manual talent post-processing done since the backup. Emergency use only.

```bash
psql "<pooler-connection-string>" < supabase/seed-data.sql
```

It drops `Talents`/`Cards`/`metadata`, recreates the schemas, imports the data, and restores
indexes, constraints, and permissions.

## What the dump contains

- **Schemas**: `CREATE TABLE` with all columns, constraints, and sequences
- **`Talents`**: all rows, including the manually post-processed requirement fields —
  this is the _only_ source of truth for that work (see
  [functions/README.md](./functions/README.md))
- **`Cards`**: all rows
- **`metadata`**: schema only in practice; the table is empty
- **Indexes, constraints, and Supabase role permissions** (`postgres`, `anon`,
  `authenticated`, `service_role`)

Excluded: auth tables (not needed locally) and ownership info (`--no-owner`).

New columns added to production are picked up automatically by future dumps.
