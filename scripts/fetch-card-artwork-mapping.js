#!/usr/bin/env node

/**
 * This script:
 * 1. Fetches artwork data from blightbane.io/api/artwork
 * 2. Saves it to src/shared/data/card-artwork.json
 */

const https = require('https')
const fs = require('fs')
const path = require('path')

const ARTWORK_API_URL = 'https://blightbane.io/api/artwork'
const OUTPUT_FILE = path.join(__dirname, '../src/shared/data/card-artwork.json')

/**
 * Makes an HTTPS GET request
 */
function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        let data = ''

        res.on('data', (chunk) => {
          data += chunk
        })

        res.on('end', () => {
          if (res.statusCode === 200) {
            resolve(data)
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`))
          }
        })
      })
      .on('error', reject)
  })
}

async function main() {
  try {
    console.log('Fetching artwork data from', ARTWORK_API_URL)
    const response = await httpsGet(ARTWORK_API_URL)

    console.log('Parsing JSON response...')
    const artworkData = JSON.parse(response)

    console.log(`Received ${Array.isArray(artworkData) ? artworkData.length : Object.keys(artworkData).length} artwork entries`)

    // Ensure output directory exists
    const outputDir = path.dirname(OUTPUT_FILE)
    if (!fs.existsSync(outputDir)) {
      console.log('Creating output directory:', outputDir)
      fs.mkdirSync(outputDir, { recursive: true })
    }

    console.log('Writing data to', OUTPUT_FILE)
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(artworkData, null, 2), 'utf8')

    console.log('\nSuccess!')
    console.log(`Output written to: ${OUTPUT_FILE}`)
    console.log(`File size: ${(fs.statSync(OUTPUT_FILE).size / 1024).toFixed(2)} KB`)
  } catch (error) {
    console.error('Error:', error.message)
    process.exit(1)
  }
}

main()
