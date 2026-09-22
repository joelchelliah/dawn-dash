#!/usr/bin/env node

/**
 * Parse treasures data
 *
 * Reads scripts/data/treasures.json and splits it into the two lists the codex consumes:
 * 1. src/codex/data/treasure-cards.json  <- the `entries` field
 * 2. src/codex/data/treasure-pools.json  <- the `pools` field
 */

const path = require('path')

const {
  pickFields,
  writeJson,
  logIgnoredFields,
  readInputFile,
  ensureOutputDir,
} = require('./whitelist-fields')

const INPUT_FILE = path.join(__dirname, '../data', 'treasures.json')
const OUTPUT_DIR = path.join(__dirname, '../../src/codex/data')
const CARDS_OUTPUT_FILE = path.join(OUTPUT_DIR, 'treasure-cards.json')
const POOLS_OUTPUT_FILE = path.join(OUTPUT_DIR, 'treasure-pools.json')

/*
 * Normalized to a uniform `{ sourceType, name, guaranteed, pools }` so one `TreasureSource` type
 * covers all three lists. Upstream has already merged what used to be one entry per source-and-pool
 * into one entry per source, so a source appears exactly once and carries every pool it draws this
 * treasure from. `guaranteed` and `pools` are independent — the UI splits on `guaranteed`, then
 * lists the pools. Note the tags name more pools than `pools` declares: the declared ones are the
 * treasure pools Booty documents, the rest (Elite, Equipment, Potion, Rare, Uncommon) are general
 * reward pools.
 */
const SOURCE_FIELDS = {
  fromEvents: 'event',
  fromCards: 'card',
  fromTalents: 'talent',
}

/*
 * Upstream calls it `type`; renamed so a pool's sources share the `TreasureSource` shape minus its
 * drop fields — the pool is the thing being reached, so there is no further pool to draw from and
 * nothing to be guaranteed.
 */
const toPoolSource = ({ type, name }) => ({ sourceType: type, name })

const CARD_FIELDS = [
  'id',
  'name',
  'rarity',
  'category',
  'type',
  'inCardRewards',
  'inMerchant',
  'inAlchemist',
  'fromTranspose',
  'fromTrade',
  'hasConjurationRoute',
  'fromEvents',
  'fromCards',
  'fromTalents',
]

const POOL_FIELDS = ['pool', 'contains', 'size', 'reachedBy']

const FIELD_OPTIONS = { sourceFields: SOURCE_FIELDS }

function main() {
  try {
    const treasuresData = readInputFile(
      INPUT_FILE,
      'treasures.json comes from the external treasure-extraction tool'
    )

    const { entries, pools } = treasuresData

    if (!Array.isArray(entries)) throw new Error('Missing or invalid `entries` field')
    if (!Array.isArray(pools)) throw new Error('Missing or invalid `pools` field')

    ensureOutputDir(OUTPUT_DIR)

    const ignored = new Set()
    const cards = entries.map((entry) =>
      pickFields(entry, CARD_FIELDS, ignored, 'entries', FIELD_OPTIONS)
    )
    const poolList = pools.map((pool) => {
      const picked = pickFields(pool, POOL_FIELDS, ignored, 'pools', FIELD_OPTIONS)

      return { ...picked, reachedBy: picked.reachedBy.map(toPoolSource) }
    })

    console.log('\nWriting output files...')
    writeJson(CARDS_OUTPUT_FILE, cards, 'treasure cards')
    writeJson(POOLS_OUTPUT_FILE, poolList, 'treasure pools')

    logIgnoredFields(ignored, 'CARD_FIELDS / POOL_FIELDS / SOURCE_FIELDS')

    console.log('\nSuccess!')
  } catch (error) {
    console.error('Error:', error.message)
    process.exit(1)
  }
}

main()
