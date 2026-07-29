#!/usr/bin/env node

/**
 * Back up the production Talents/Cards/metadata tables to a loadable SQL dump.
 *
 * This automates the pg_dump + cleanup pipeline that supabase/SEED_DATA.md used to
 * spell out by hand: dump the three tables, strip the Supabase-specific \restrict
 * lines, prepend DROP statements so the dump can be re-imported over existing tables,
 * and append the role grants that --no-privileges leaves out.
 *
 * Run this BEFORE the sync-talents edge function. The sync only inserts, but the
 * manual post-processing in the Talents table (requires_classes, requires_energy,
 * requires_cards, event_requirement_matrix) has no other source of truth — a dump is
 * the only way back if a row gets clobbered or `clear:true` is passed by accident.
 *
 * Requires `pg_dump` on PATH (brew install postgresql). The password is not stored
 * anywhere in the repo, so it has to be supplied per run.
 *
 * Usage:
 *   npm run backup-talents -- <db-password>
 *   npm run backup-talents -- <db-password> --out supabase/seed-data.sql
 *
 * By default it writes a timestamped file to supabase/backups/ and leaves the
 * checked-in seed-data.sql alone. To refresh the seed data, test the timestamped dump
 * against a local Supabase and then `mv` it into place, so the bytes you verified are
 * the bytes you commit — see supabase/SEED_DATA.md. `--out` writes straight to a given
 * path, skipping that safety net.
 */

const { execFileSync, spawnSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const PROJECT_REF_FILE = path.join(__dirname, '../supabase/.temp/project-ref')
const POOLER_URL_FILE = path.join(__dirname, '../supabase/.temp/pooler-url')
const DEFAULT_BACKUP_DIR = path.join(__dirname, '../supabase/backups')
const SEED_DATA_FILE = path.join(__dirname, '../supabase/seed-data.sql')
const TABLES = ['"Talents"', '"Cards"', 'metadata']

// Prepended to the dump so it can be imported over existing tables. Mirrors the DROP
// block in the checked-in seed-data.sql; keep the two in step if the schema changes.
const DROP_STATEMENTS = `
DROP POLICY IF EXISTS "Enable read access for all users" ON public."Talents";
DROP POLICY IF EXISTS "Enable read access for all users" ON public."Cards";
DROP POLICY IF EXISTS "Allow all access to metadata" ON public.metadata;
DROP INDEX IF EXISTS public."Talents_expansion_idx";
DROP INDEX IF EXISTS public."Talents_color_idx";
DROP INDEX IF EXISTS public."Cards_expansion_idx";
DROP INDEX IF EXISTS public."Cards_color_idx";
DROP INDEX IF EXISTS public."Cards_name_idx";
ALTER TABLE IF EXISTS ONLY public.metadata DROP CONSTRAINT IF EXISTS metadata_pkey;
ALTER TABLE IF EXISTS ONLY public."Talents" DROP CONSTRAINT IF EXISTS "Talents_pkey";
ALTER TABLE IF EXISTS ONLY public."Talents" DROP CONSTRAINT IF EXISTS "Talents_id_key";
ALTER TABLE IF EXISTS ONLY public."Cards" DROP CONSTRAINT IF EXISTS "Cards_pkey";
ALTER TABLE IF EXISTS ONLY public."Cards" DROP CONSTRAINT IF EXISTS "Cards_id_key";
DROP TABLE IF EXISTS public.metadata;
DROP TABLE IF EXISTS public."Talents";
DROP TABLE IF EXISTS public."Cards";
`

// --no-privileges strips these, but without them the anon/authenticated roles the app
// uses have no access to the restored tables.
const GRANT_STATEMENTS = `
--
-- Grant permissions to Supabase roles
--

GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;
`

function fail(message) {
  console.error(`\n❌ ${message}\n`)
  process.exit(1)
}

function parseArgs(argv) {
  const args = argv.slice(2)
  const outIndex = args.findIndex((a) => a === '--out')

  let outPath = null
  if (outIndex !== -1) {
    outPath = args[outIndex + 1]
    if (!outPath || outPath.startsWith('--')) {
      fail('--out needs a file path, e.g. --out supabase/seed-data.sql')
    }
    args.splice(outIndex, 2)
  }

  const password = args[0]
  if (!password) {
    console.error(
      [
        '',
        '❌ Missing database password.',
        '',
        'Usage:',
        '  npm run backup-talents -- <db-password>',
        '  npm run backup-talents -- <db-password> --out supabase/seed-data.sql',
        '',
        'Is it in your password manager? If it is lost, reset it under Project Settings → Database.',
        '',
      ].join('\n')
    )
    process.exit(1)
  }

  return { password, outPath }
}

/**
 * Build the connection string, without the password.
 *
 * Prefers the pooler URL written by `supabase link`. The direct
 * `db.<ref>.supabase.co` host that SEED_DATA.md documents no longer resolves —
 * Supabase retired direct IPv4 connections — so the pooler is the working route.
 * Note the pooler username is `postgres.<project-ref>`, not plain `postgres`.
 */
function readConnectionUri() {
  if (fs.existsSync(POOLER_URL_FILE)) {
    const pooled = fs.readFileSync(POOLER_URL_FILE, 'utf8').trim()
    if (pooled) return pooled
  }

  if (!fs.existsSync(PROJECT_REF_FILE)) {
    fail(
      `Could not read the Supabase connection details from ${POOLER_URL_FILE}\n` +
        `   or ${PROJECT_REF_FILE}. Run \`npx supabase link\` first.`
    )
  }

  const projectRef = fs.readFileSync(PROJECT_REF_FILE, 'utf8').trim()
  return `postgresql://postgres@db.${projectRef}.supabase.co:5432/postgres`
}

function assertPgDumpAvailable() {
  const result = spawnSync('pg_dump', ['--version'], { encoding: 'utf8' })
  if (result.error) {
    fail('`pg_dump` not found on PATH. Install it with `brew install postgresql`.')
  }
  return result.stdout.trim()
}

/** Strip the Supabase-specific \restrict/\unrestrict lines, which psql can't load. */
function stripRestrictLines(sql) {
  return sql
    .split('\n')
    .filter((line) => !/^\\(un)?restrict\b/.test(line))
    .join('\n')
}

/** Insert the DROP block right after the `SET row_security = off;` header line. */
function insertDropStatements(sql) {
  const marker = 'SET row_security = off;'
  const index = sql.indexOf(marker)
  if (index === -1) {
    fail('Unexpected dump format: could not find the "SET row_security = off;" header line.')
  }
  const insertAt = index + marker.length
  return sql.slice(0, insertAt) + '\n' + DROP_STATEMENTS + sql.slice(insertAt)
}

/** Append the role grants before pg_dump's trailing "dump complete" comment. */
function appendGrantStatements(sql) {
  const marker = '-- PostgreSQL database dump complete'
  const index = sql.indexOf(marker)
  if (index === -1) return sql + GRANT_STATEMENTS
  return sql.slice(0, index) + GRANT_STATEMENTS + '\n' + sql.slice(index)
}

function countCopyRows(sql, table) {
  const start = sql.indexOf(`COPY public.${table}`)
  if (start === -1) return 0

  let count = 0
  for (const line of sql.slice(start).split('\n').slice(1)) {
    // pg_dump terminates each COPY block with a lone backslash-dot
    if (line === '\\.') break
    if (line.length > 0) count++
  }
  return count
}

/** Pull one table's column definitions out of its CREATE TABLE block. */
function extractColumns(sql, table) {
  const match = sql.match(
    new RegExp(`CREATE TABLE public\\.${escapeForRegex(table)} \\(([\\s\\S]*?)\\);`)
  )
  if (!match) return null

  return match[1]
    .trim()
    .split('\n')
    .map((line) => line.trim().replace(/,$/, ''))
    .filter(Boolean)
}

function escapeForRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Sanity-check the fresh dump against the checked-in seed-data.sql.
 *
 * These files are never byte-identical — new rows arrive constantly — so this compares
 * *shape*: same tables, same columns, and a row count that hasn't collapsed. It exists
 * to catch a dump that is structurally valid but quietly wrong (a table that failed to
 * dump, a column dropped, half the rows missing), which a visual check in the app will
 * not reliably reveal.
 *
 * Differences are reported, never fatal: a new column or a higher row count is the
 * normal, expected case.
 */
function compareWithSeedData(sql) {
  if (!fs.existsSync(SEED_DATA_FILE)) return null

  const seed = fs.readFileSync(SEED_DATA_FILE, 'utf8')
  const notes = []

  for (const table of TABLES) {
    const seedColumns = extractColumns(seed, table)
    const dumpColumns = extractColumns(sql, table)

    if (!dumpColumns) {
      notes.push({ level: 'error', text: `${table}: missing from the new dump entirely` })
      continue
    }
    if (!seedColumns) {
      notes.push({ level: 'info', text: `${table}: not in seed-data.sql, nothing to compare` })
      continue
    }

    const added = dumpColumns.filter((c) => !seedColumns.includes(c))
    const removed = seedColumns.filter((c) => !dumpColumns.includes(c))

    for (const column of added) {
      notes.push({ level: 'info', text: `${table}: new column — ${column}` })
    }
    for (const column of removed) {
      // Could be a legitimate schema change, but is equally the signature of a
      // truncated or partial dump, so it's worth a louder flag than an addition.
      notes.push({ level: 'warn', text: `${table}: column in seed but NOT in dump — ${column}` })
    }

    const seedRows = countCopyRows(seed, table)
    const dumpRows = countCopyRows(sql, table)

    if (seedRows > 0 && dumpRows < seedRows * 0.9) {
      notes.push({
        level: 'warn',
        text: `${table}: ${dumpRows} rows vs ${seedRows} in seed — more than 10% fewer`,
      })
    } else {
      const delta = dumpRows - seedRows
      const suffix = delta === 0 ? 'unchanged' : `${delta > 0 ? '+' : ''}${delta} vs seed`
      notes.push({ level: 'info', text: `${table}: ${dumpRows} rows (${suffix})` })
    }
  }

  return notes
}

function main() {
  const { password, outPath } = parseArgs(process.argv)

  const pgDumpVersion = assertPgDumpAvailable()
  const connectionUri = readConnectionUri()
  const host = new URL(connectionUri).host

  const target = outPath
    ? path.resolve(process.cwd(), outPath)
    : path.join(
        DEFAULT_BACKUP_DIR,
        // Colons are legal on macOS but awkward in shells, so use a flat stamp
        `talents-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.sql`
      )

  console.log(`Using ${pgDumpVersion}`)
  console.log(`Dumping ${TABLES.join(', ')} from ${host}...`)

  let raw
  try {
    raw = execFileSync(
      'pg_dump',
      [
        ...TABLES.flatMap((table) => ['--table', `public.${table}`]),
        '--no-owner',
        '--no-privileges',
        // Password goes via env, not the connection string, so it stays out of the
        // process list where `ps` could read it.
        connectionUri,
      ],
      {
        encoding: 'utf8',
        maxBuffer: 256 * 1024 * 1024,
        env: { ...process.env, PGPASSWORD: password },
        stdio: ['ignore', 'pipe', 'pipe'],
      }
    )
  } catch (error) {
    const stderr = (error.stderr || '').trim()
    fail(
      `pg_dump failed.${stderr ? `\n\n${stderr}` : ''}\n\n` +
        '   Check the password, and that your IP is allowed under\n' +
        '   Project Settings → Database → Network Restrictions.'
    )
  }

  const sql = appendGrantStatements(insertDropStatements(stripRestrictLines(raw)))

  const talents = countCopyRows(sql, '"Talents"')
  const cards = countCopyRows(sql, '"Cards"')

  if (talents === 0) {
    fail('The dump contains no Talents rows — refusing to write a useless backup.')
  }

  fs.mkdirSync(path.dirname(target), { recursive: true })
  fs.writeFileSync(target, sql)

  const sizeMb = (fs.statSync(target).size / (1024 * 1024)).toFixed(1)
  console.log('')
  console.log(`✅ Backup written to ${path.relative(process.cwd(), target)} (${sizeMb} MB)`)
  console.log(`   Talents: ${talents} rows`)
  console.log(`   Cards:   ${cards} rows`)

  const notes = compareWithSeedData(sql)
  if (notes) {
    const icons = { info: '  ·', warn: '  ⚠️ ', error: '  ❌' }
    console.log('')
    console.log('Compared against the checked-in seed-data.sql:')
    for (const { level, text } of notes) {
      console.log(`${icons[level]} ${text}`)
    }

    if (notes.some((n) => n.level !== 'info')) {
      console.log('')
      console.log('⚠️  Review the flagged items above before trusting this dump. A missing')
      console.log('   table/column or a large row drop can mean a partial dump rather than')
      console.log('   a real schema change.')
    }
  }

  const relativeTarget = path.relative(process.cwd(), target)

  if (!outPath) {
    console.log('')
    console.log('This is a timestamped backup; the checked-in seed-data.sql was not touched.')
    console.log('')
    console.log('To promote it to the seed data, test it against a local Supabase first:')
    console.log('  npx supabase stop && npx supabase start')
    console.log(
      `  psql "postgresql://postgres:postgres@localhost:54322/postgres" -f ${relativeTarget}`
    )
    console.log('  npm run dev   # then check /cardex and /skilldex')
    console.log('')
    console.log('Then move the file you just verified into place:')
    console.log(`  mv ${relativeTarget} supabase/seed-data.sql`)
  }
  console.log('')
}

main()
