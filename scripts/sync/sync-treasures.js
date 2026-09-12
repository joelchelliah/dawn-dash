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

const FLATTENED_FIELDS = {
  fromEvents: 'event',
  fromTreasureEvents: 'event',
  fromCards: 'card',
  fromTalents: 'talent',
}

// Kept as objects: which of the three keys is set is what labels the source tag in the UI.
const NESTED_FIELDS = {
  reachedBy: ['card', 'talent', 'event'],
}

const CARD_FIELDS = [
  'id',
  'name',
  'category',
  'type',
  'inCardRewards',
  'inMerchant',
  'inAlchemist',
  'fromTranspose',
  'fromTrade',
  'fromEvents',
  'fromTreasureEvents',
  'fromCards',
  'fromTalents',
]

const POOL_FIELDS = ['pool', 'contains', 'size', 'reachedBy']

const FIELD_OPTIONS = { flattenedFields: FLATTENED_FIELDS, nestedFields: NESTED_FIELDS }

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
    const poolList = pools.map((pool) =>
      pickFields(pool, POOL_FIELDS, ignored, 'pools', FIELD_OPTIONS)
    )

    console.log('\nWriting output files...')
    writeJson(CARDS_OUTPUT_FILE, cards, 'treasure cards')
    writeJson(POOLS_OUTPUT_FILE, poolList, 'treasure pools')

    logIgnoredFields(ignored, 'CARD_FIELDS / POOL_FIELDS / NESTED_FIELDS')

    console.log('\nSuccess!')
  } catch (error) {
    console.error('Error:', error.message)
    process.exit(1)
  }
}

main()
