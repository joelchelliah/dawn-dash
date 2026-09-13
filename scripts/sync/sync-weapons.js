#!/usr/bin/env node

/**
 * Parse special weapons data
 *
 * Reads scripts/data/weapons.json and writes the whitelisted fields of its `entries`
 * to src/codex/data/special-weapons.json.
 */

const path = require('path')

const {
  pickFields,
  writeJson,
  logIgnoredFields,
  readInputFile,
  ensureOutputDir,
} = require('./whitelist-fields')

const INPUT_FILE = path.join(__dirname, '../data', 'weapons.json')
const OUTPUT_DIR = path.join(__dirname, '../../src/codex/data')
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'special-weapons.json')

/*
 * Same source shape as treasures — normalized to `{ sourceType, name, pool }`, where a named `pool`
 * means the weapon is only a chance from that source and `pool: null` means a guaranteed drop.
 */
const SOURCE_FIELDS = {
  fromEvents: 'event',
  fromCards: 'card',
  fromTalents: 'talent',
}

const WEAPON_FIELDS = [
  'id',
  'name',
  'category',
  'type',
  'isTreasure',
  'fromEvents',
  'fromCards',
  'fromTalents',
]

function main() {
  try {
    const weaponsData = readInputFile(
      INPUT_FILE,
      'weapons.json comes from the external weapon-extraction tool'
    )

    const { entries } = weaponsData

    if (!Array.isArray(entries)) throw new Error('Missing or invalid `entries` field')

    ensureOutputDir(OUTPUT_DIR)

    const ignored = new Set()
    const weapons = entries.map((entry) =>
      pickFields(entry, WEAPON_FIELDS, ignored, 'entries', { sourceFields: SOURCE_FIELDS })
    )

    console.log('\nWriting output file...')
    writeJson(OUTPUT_FILE, weapons, 'special weapons')

    logIgnoredFields(ignored, 'WEAPON_FIELDS / SOURCE_FIELDS')

    console.log('\nSuccess!')
  } catch (error) {
    console.error('Error:', error.message)
    process.exit(1)
  }
}

main()
