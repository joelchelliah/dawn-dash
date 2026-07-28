#!/usr/bin/env node

/**
 * Talent sync helper — the automatable half of the talent sync workflow.
 *
 * The actual insert into Supabase is NOT done here: it lives in the
 * `sync-talents` edge function, because writing to the Talents table needs the
 * service role key (RLS only grants anon SELECT). This script does everything
 * around that write:
 *
 * 1. Diffs the Blightbane talent list against the production Talents table, so
 *    you know exactly what the edge function will insert before running it.
 * 2. Flags frontend follow-up work that new data can require: expansion indices
 *    and tiers that the Skilldex filters don't know about yet.
 * 3. Lists rows still awaiting manual post-processing (verified = false).
 * 4. Prints the remaining manual steps, in order.
 *
 * Read-only: it never writes to the database or to any file.
 *
 * Usage:
 *   npm run sync-talents-preflight             # diff + follow-up checks + next steps
 *   npm run sync-talents-preflight -- --json   # machine-readable diff, no prose
 */

const fs = require('fs')
const path = require('path')

const TALENTS_API =
  'https://blightbane.io/api/cards-codex?search=&rarity=&category=10&type=&banner=&exp='

const ENV_FILE = path.join(__dirname, '../.env.local')

// Kept in sync with src/codex/hooks/useSearchFilters/useCardSetFilters.ts (indexToValueMap)
// and src/codex/hooks/useSearchFilters/useTierFilters.ts (tierIndexMap). A talent whose
// expansion/tier is missing from those maps is silently hidden or mislabelled in Skilldex,
// so we check the synced data against them rather than trusting it to fit.
const KNOWN_EXPANSIONS = {
  0: 'Monster/event',
  1: 'Core',
  2: 'Metaprogress',
  3: 'Metamorphosis',
  4: 'Core',
  5: 'Infinitum',
  6: 'Catalyst',
  7: 'Eclypse',
  8: 'Synthesis',
}
const MAX_KNOWN_TIER = 6

const jsonOutput = process.argv.includes('--json')

/** Only prose goes through here, so --json output stays parseable */
function log(...args) {
  if (!jsonOutput) console.log(...args)
}

function readEnvLocal() {
  if (!fs.existsSync(ENV_FILE)) {
    throw new Error(
      'Missing .env.local — it must define NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY'
    )
  }

  const env = {}
  for (const line of fs.readFileSync(ENV_FILE, 'utf8').split('\n')) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/)
    if (match) env[match[1]] = match[2].trim().replace(/^["']|["']$/g, '')
  }

  const url = env.NEXT_PUBLIC_SUPABASE_URL
  const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    throw new Error(
      '.env.local is missing NEXT_PUBLIC_SUPABASE_URL and/or NEXT_PUBLIC_SUPABASE_ANON_KEY'
    )
  }
  return { url, key }
}

async function fetchJson(url, options) {
  const response = await fetch(url, options)
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText} for ${url}`)
  }
  return response.json()
}

async function fetchBlightbaneTalents() {
  const data = await fetchJson(TALENTS_API)
  if (!Array.isArray(data?.cards)) {
    throw new Error('Unexpected Blightbane response: missing `cards` array')
  }
  return data.cards
}

/**
 * The anon key can only SELECT, which is all we need. Paginated because
 * Supabase caps a single response at 1000 rows.
 */
async function fetchDatabaseTalents({ url, key }) {
  const pageSize = 1000
  const headers = { apikey: key, Authorization: `Bearer ${key}` }
  const all = []

  for (let offset = 0; ; offset += pageSize) {
    const page = await fetchJson(
      `${url}/rest/v1/Talents?select=blightbane_id,name,expansion,tier,verified` +
        `&order=blightbane_id&offset=${offset}&limit=${pageSize}`,
      { headers }
    )
    all.push(...page)
    if (page.length < pageSize) return all
  }
}

function buildReport(blightbaneTalents, dbTalents) {
  const dbIds = new Set(dbTalents.map((t) => t.blightbane_id))
  const blightbaneIds = new Set(blightbaneTalents.map((c) => c.id))

  const newTalents = blightbaneTalents
    .filter((c) => !dbIds.has(c.id))
    .map((c) => ({
      blightbane_id: c.id,
      name: c.name,
      expansion: c.expansion,
      // Blightbane calls it `rarity`; the Talents table calls it `tier`
      tier: c.rarity,
    }))
    .sort((a, b) => a.name.localeCompare(b.name))

  // Existing rows are deliberately never re-fetched (that would clobber the manual
  // post-processing), so a talent Blightbane has dropped just lingers. Worth surfacing.
  const orphaned = dbTalents
    .filter((t) => !blightbaneIds.has(t.blightbane_id))
    .map(({ blightbane_id, name, expansion }) => ({ blightbane_id, name, expansion }))

  const unverified = dbTalents
    .filter((t) => !t.verified)
    .map(({ blightbane_id, name, expansion }) => ({ blightbane_id, name, expansion }))

  const unknownExpansions = [
    ...new Set(newTalents.map((t) => t.expansion).filter((e) => !(e in KNOWN_EXPANSIONS))),
  ].sort((a, b) => a - b)

  const unknownTiers = [
    ...new Set(newTalents.map((t) => t.tier).filter((tier) => tier > MAX_KNOWN_TIER)),
  ].sort((a, b) => a - b)

  return { newTalents, orphaned, unverified, unknownExpansions, unknownTiers }
}

function printReport(
  { newTalents, orphaned, unverified, unknownExpansions, unknownTiers },
  counts
) {
  const heading = (text) => log(`\n${text}\n${'─'.repeat(text.length)}`)

  heading('Talent sync preflight')
  log(`Blightbane: ${counts.blightbane} talents`)
  log(`Database:   ${counts.database} talents`)

  heading(`New talents to be inserted: ${newTalents.length}`)
  if (newTalents.length === 0) {
    log('Nothing new — the database is already up to date with Blightbane.')
  } else {
    for (const t of newTalents) {
      const set = KNOWN_EXPANSIONS[t.expansion] ?? '⚠️  UNKNOWN EXPANSION'
      log(
        `  ${String(t.blightbane_id).padEnd(9)} ${t.name.padEnd(28)} tier ${t.tier}  exp ${t.expansion} (${set})`
      )
    }
  }

  if (unknownExpansions.length > 0 || unknownTiers.length > 0) {
    heading('⚠️  Frontend follow-up required')
    if (unknownExpansions.length > 0) {
      log(`New expansion index/indices: ${unknownExpansions.join(', ')}`)
      log('These are not in the Skilldex card-set filters, so the talents will be')
      log('hidden by the filter and labelled "-". Add them to:')
      log('  • CardSetFilterOption          src/codex/types/filters.ts')
      log('  • defaultCardSetFilterValueMap, indexMap, indexToValueMap')
      log('                                 src/codex/hooks/useSearchFilters/useCardSetFilters.ts')
      log('  • KNOWN_EXPANSIONS             scripts/sync-talents-preflight.js')
      log('Then bump TALENTS_CACHE_VERSION in src/codex/utils/codexFilterStore.ts')
      log('so existing users get the new card set enabled by default.')
    }
    if (unknownTiers.length > 0) {
      log(`\nNew tier(s): ${unknownTiers.join(', ')}`)
      log('Add them to TierFilterOption (src/codex/types/filters.ts), useTierFilters.ts,')
      log('and MAX_KNOWN_TIER in scripts/sync-talents-preflight.js.')
    }
  } else if (newTalents.length > 0) {
    heading('Frontend follow-up')
    log('None — all expansions and tiers are already known to the Skilldex filters.')
  }

  if (orphaned.length > 0) {
    heading(`Rows in the database but no longer in Blightbane: ${orphaned.length}`)
    log('Not touched by the sync (it only inserts). Check whether these were renamed,')
    log('reworked, or removed from the game.')
    for (const t of orphaned) {
      log(`  ${String(t.blightbane_id).padEnd(9)} ${t.name} (exp ${t.expansion})`)
    }
  }

  if (unverified.length > 0) {
    heading(`Rows still awaiting manual post-processing: ${unverified.length}`)
    log('These have verified = false, so their requirement fields have not been')
    log('reviewed yet. Until they are, they show up under "No Requirements".')
    for (const t of unverified) {
      log(`  ${String(t.blightbane_id).padEnd(9)} ${t.name} (exp ${t.expansion})`)
    }
  }

  heading('Next steps (manual)')
  if (newTalents.length === 0 && unverified.length === 0) {
    log('Nothing to do.')
    return
  }
  if (newTalents.length > 0) {
    log('1. Back up first: npm run backup-talents -- <db-password>')
    log('2. Supabase Dashboard → Edge Functions → sync-talents → Run.')
    log('   Do NOT pass clear:true — it wipes the manual post-processing.')
    log('3. Fill in the requirement fields for the new rows:')
    log('     select * from "Talents" where verified = false;')
    log('   Populate requires_classes / requires_energy / requires_cards /')
    log('   event_requirement_matrix, then set verified = true.')
    log('4. Bump CACHE_VERSION in src/codex/utils/codexTalentsStore.ts.')
    log('5. npm run verify, then check /skilldex in the dev server.')
  } else {
    log('1. Finish the manual post-processing for the unverified rows listed above.')
    log('2. Bump CACHE_VERSION in src/codex/utils/codexTalentsStore.ts.')
    log('3. npm run verify, then check /skilldex in the dev server.')
  }
  log('')
  log('See supabase/functions/README.md for the full workflow.')
}

async function main() {
  try {
    const credentials = readEnvLocal()

    log('Fetching talents from Blightbane and Supabase...')
    const [blightbaneTalents, dbTalents] = await Promise.all([
      fetchBlightbaneTalents(),
      fetchDatabaseTalents(credentials),
    ])

    const report = buildReport(blightbaneTalents, dbTalents)

    if (jsonOutput) {
      console.log(
        JSON.stringify(
          {
            counts: { blightbane: blightbaneTalents.length, database: dbTalents.length },
            ...report,
          },
          null,
          2
        )
      )
    } else {
      printReport(report, {
        blightbane: blightbaneTalents.length,
        database: dbTalents.length,
      })
    }
  } catch (error) {
    console.error(`\n❌ Talent sync preflight failed: ${error.message}\n`)
    process.exit(1)
  }
}

main()
