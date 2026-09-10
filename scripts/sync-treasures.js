#!/usr/bin/env node

/**
 * Parse treasures data
 *
 * Reads scripts/data/treasures.json and splits it into the two lists the codex consumes:
 * 1. src/codex/data/treasure-cards.json  <- the `entries` field
 * 2. src/codex/data/treasure-pools.json  <- the `pools` field
 */

const { execFileSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const INPUT_FILE = path.join(__dirname, 'data', 'treasures.json')
const OUTPUT_DIR = path.join(__dirname, '../src/codex/data')
const CARDS_OUTPUT_FILE = path.join(OUTPUT_DIR, 'treasure-cards.json')
const POOLS_OUTPUT_FILE = path.join(OUTPUT_DIR, 'treasure-pools.json')

function writeJson(outputFile, data, label) {
  fs.writeFileSync(outputFile, `${JSON.stringify(data, null, 2)}\n`, 'utf8')

  execFileSync('npx', ['prettier', '--write', '--log-level', 'warn', outputFile], {
    cwd: path.join(__dirname, '..'),
  })

  const sizeKb = (fs.statSync(outputFile).size / 1024).toFixed(2)
  console.log(`   ✅ ${data.length} ${label} -> ${outputFile} (${sizeKb} KB)`)
}

function main() {
  try {
    if (!fs.existsSync(INPUT_FILE)) {
      throw new Error(
        `Input file not found: ${INPUT_FILE}\n` +
          '   treasures.json comes from the external extraction tool and must be pasted in manually.'
      )
    }

    console.log('Reading treasures data from', INPUT_FILE)
    const treasuresData = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'))

    const { entries, pools } = treasuresData

    if (!Array.isArray(entries)) throw new Error('Missing or invalid `entries` field')
    if (!Array.isArray(pools)) throw new Error('Missing or invalid `pools` field')

    if (!fs.existsSync(OUTPUT_DIR)) {
      console.log('Creating output directory:', OUTPUT_DIR)
      fs.mkdirSync(OUTPUT_DIR, { recursive: true })
    }

    console.log('\nWriting output files...')
    writeJson(CARDS_OUTPUT_FILE, entries, 'treasure cards')
    writeJson(POOLS_OUTPUT_FILE, pools, 'treasure pools')

    console.log('\nSuccess!')
  } catch (error) {
    console.error('Error:', error.message)
    process.exit(1)
  }
}

main()
