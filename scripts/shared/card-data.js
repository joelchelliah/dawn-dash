/**
 * Card/talent data shared by the event pipeline steps:
 * - the id -> name mapping fetched from the Blightbane API (with a local file cache,
 *   so the parse step can run offline and doesn't re-fetch within one sync run)
 * - the list of commands whose value is a numeric card/talent id
 */
const fs = require('fs')
const https = require('https')
const path = require('path')

const CARDS_API =
  'https://blightbane.io/api/cards-codex?search=&rarity=&category=&type=&banner=&exp='
const TALENTS_API =
  'https://blightbane.io/api/cards-codex?search=&rarity=&category=10&type=&banner=&exp='

// Written by extract-events.js (which always fetches live), read by parse-event-trees.js
const MAPPING_CACHE_FILE = path.join(__dirname, '../data/card-id-mapping.json')

// All commands whose value can be a numeric card/talent id.
// AREAEFFECT is only resolved during parse post-processing (replaceCardIds pass), where
// ids appear in extracted *effects*; the other commands are additionally replaced inline
// in the raw Ink text by extract-events.js before parsing (INLINE_CARD_ID_COMMANDS).
const CARD_ID_COMMANDS = [
  'AREAEFFECT',
  'ADDCARD',
  'REMOVECARD',
  'IMBUECARD',
  'ADDTALENT',
  'REMOVETALENT',
]
const INLINE_CARD_ID_COMMANDS = CARD_ID_COMMANDS.filter((cmd) => cmd !== 'AREAEFFECT')

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        let data = ''
        res.on('data', (chunk) => {
          data += chunk
        })
        res.on('end', () => {
          try {
            resolve(JSON.parse(data))
          } catch (e) {
            reject(e)
          }
        })
      })
      .on('error', reject)
  })
}

/**
 * Fetch the card/talent id -> name mapping from the Blightbane API and cache it
 * to scripts/data/ for later pipeline steps.
 */
async function buildIdToNameMapping() {
  const [cardsRes, talentsRes] = await Promise.all([fetchJson(CARDS_API), fetchJson(TALENTS_API)])
  const mapping = {}
  for (const item of [...(cardsRes.cards || []), ...(talentsRes.cards || [])]) {
    if (item.id != null && item.name != null) {
      mapping[item.id] = item.name
    }
  }
  fs.writeFileSync(MAPPING_CACHE_FILE, JSON.stringify(mapping, null, 2), 'utf-8')
  return mapping
}

/**
 * Read the cached id -> name mapping if present (normal case within a sync-events.js
 * run, and enables offline re-runs of the parse step); fall back to a live fetch.
 */
async function readOrFetchIdToNameMapping() {
  if (fs.existsSync(MAPPING_CACHE_FILE)) {
    const ageMinutes = Math.round((Date.now() - fs.statSync(MAPPING_CACHE_FILE).mtimeMs) / 60000)
    console.log(
      `  Using cached mapping from ${path.relative(process.cwd(), MAPPING_CACHE_FILE)} ` +
        `(${ageMinutes} min old — extract-events.js refreshes it)`
    )
    return JSON.parse(fs.readFileSync(MAPPING_CACHE_FILE, 'utf-8'))
  }
  console.log('  No cached mapping found - fetching from the Blightbane API...')
  return buildIdToNameMapping()
}

module.exports = {
  fetchJson,
  buildIdToNameMapping,
  readOrFetchIdToNameMapping,
  CARD_ID_COMMANDS,
  INLINE_CARD_ID_COMMANDS,
}
