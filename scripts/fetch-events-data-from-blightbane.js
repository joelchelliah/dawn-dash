#!/usr/bin/env node

/**
 * This script:
 * 1. Fetches the HTML from blightbane.io
 * 2. Extracts the main JavaScript bundle URL
 * 3. Downloads and parses the bundle to extract JSON.parse() calls
 * 4. Outputs the extracted data to scripts/dump.txt
 */

const https = require('https')
const fs = require('fs')
const path = require('path')

const BLIGHTBANE_URL = 'https://www.blightbane.io/'
const OUTPUT_FILE = path.join(__dirname, 'dump.txt')

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

/**
 * Extracts the main JavaScript bundle URL from the HTML
 */
function extractBundleUrl(html) {
  // Look for the main bundle: js/index.bundle.js
  const bundleRegex = /<script[^>]+src="([^"]*index\.bundle\.js[^"]*)"/i
  const match = bundleRegex.exec(html)

  if (match) {
    const src = match[1]
    return src.startsWith('http') ? src : `https://www.blightbane.io/${src}`
  }

  // Fallback: look for any script with "bundle" in the name
  const fallbackRegex = /<script[^>]+src="([^"]*bundle\.js[^"]*)"/gi
  const fallbackMatch = fallbackRegex.exec(html)

  if (fallbackMatch) {
    const src = fallbackMatch[1]
    return src.startsWith('http') ? src : `https://www.blightbane.io/${src}`
  }

  throw new Error('Could not find JavaScript bundle URL in HTML')
}

/**
 * Extracts all JSON.parse() calls from the JavaScript bundle
 */
function extractJsonParseData(jsCode) {
  // Match JSON.parse('...') or JSON.parse("...")
  // This regex handles escaped quotes and nested content
  const jsonParseRegex = /JSON\.parse\s*\(\s*(['"`])((?:(?!\1).|\\\1)*)\1\s*\)/g
  const results = []
  let match

  while ((match = jsonParseRegex.exec(jsCode)) !== null) {
    const quote = match[1]
    const jsonString = match[2]

    try {
      // Unescape the string (handle \\", \\', etc.)
      const unescaped = jsonString.replace(/\\"/g, '"').replace(/\\'/g, "'").replace(/\\\\/g, '\\')

      // Validate it's actually JSON
      JSON.parse(unescaped)
      results.push({ quote, content: unescaped })
    } catch (e) {
      // Skip invalid JSON
      console.warn('Skipping invalid JSON.parse() call')
    }
  }

  return results
}

/**
 * Finds variable assignments with JSON.parse() calls
 */
function extractVariableAssignments(jsCode) {
  // Look for patterns like: var _a = JSON.parse('...')
  // or: const _a = JSON.parse('...')
  // or: , _a = JSON.parse('...')

  const lines = []

  // Match: (var|const|let|,) name = JSON.parse('...')
  const regex = /((?:^|[,;]\s*)((?:var|const|let)\s+)?(\w+)\s*=\s*JSON\.parse\s*\(\s*['"`])/gm

  let match

  while ((match = regex.exec(jsCode)) !== null) {
    const prefix = match[1]
    const varKeyword = match[2] || ''
    const varName = match[3]
    const startPos = match.index + match[0].length - 1 // Position of opening quote

    // Find the matching closing quote and parenthesis
    const quote = jsCode[startPos]
    const depth = 0
    let escaped = false
    let i = startPos + 1
    let jsonContent = ''

    while (i < jsCode.length) {
      const char = jsCode[i]

      if (escaped) {
        jsonContent += char
        escaped = false
      } else if (char === '\\') {
        jsonContent += char
        escaped = true
      } else if (char === quote) {
        // Found closing quote
        break
      } else {
        jsonContent += char
      }

      i++
    }

    if (i < jsCode.length && jsCode[i] === quote) {
      // Construct the line
      const declPrefix = prefix.trim().endsWith(',') ? ',' : varKeyword
      const line = `${declPrefix} ${varName} = JSON.parse('${jsonContent}')`
      lines.push({ varName, line, jsonContent })
      lastIndex = i
    }
  }

  return lines
}

/**
 * Checks if a JSON string appears to be event data
 * Events have: name, type, artwork, and text fields
 * We check the raw string instead of parsing to avoid escape issues
 */
function looksLikeEventData(jsonString) {
  // Check if it starts with an array
  if (!jsonString.trim().startsWith('[')) {
    return false
  }

  const requiredFields = ['"name":', '"type":', '"artwork":', '"text":']
  const firstPart = jsonString.substring(0, 500) // Check first 500 chars

  return requiredFields.every((field) => firstPart.includes(field))
}

async function main() {
  try {
    console.log('Fetching HTML from', BLIGHTBANE_URL)
    const html = await httpsGet(BLIGHTBANE_URL)

    console.log('Extracting JavaScript bundle URL...')
    const bundleUrl = extractBundleUrl(html)
    console.log('Found bundle:', bundleUrl)

    console.log('Downloading JavaScript bundle...')
    const jsCode = await httpsGet(bundleUrl)
    console.log(`Bundle size: ${(jsCode.length / 1024 / 1024).toFixed(2)} MB`)

    console.log('Extracting JSON.parse() data...')
    const assignments = extractVariableAssignments(jsCode)
    console.log(`Found ${assignments.length} variable assignments with JSON.parse()`)

    // Identify which variables contain event data
    console.log('\nAnalyzing data types...')
    const eventAssignments = []
    for (const assignment of assignments) {
      // Check the raw JSON string for event data patterns
      if (looksLikeEventData(assignment.jsonContent)) {
        console.log(`  ✓ ${assignment.varName} contains event data`)
        eventAssignments.push(assignment)
      }
    }

    // Only write event data to dump.txt
    if (eventAssignments.length === 0) {
      // eslint-disable-next-line no-console
      console.log('\n⚠️  No event data found in bundle!')
      // eslint-disable-next-line no-console
      console.log("This might indicate a change in Blightbane's data structure.")
      process.exit(1)
    }

    const eventOutput = eventAssignments.map((a) => a.line).join('\n')
    console.log(`\nWriting ${eventAssignments.length} event variable(s) to`, OUTPUT_FILE)
    fs.writeFileSync(OUTPUT_FILE, eventOutput, 'utf8')

    console.log(`\nSuccess! Extracted event data from ${eventAssignments.length} variable(s)`)
    console.log(`  - Total variables found: ${assignments.length}`)
    console.log(`  - Event variables: ${eventAssignments.map((a) => a.varName).join(', ')}`)
    console.log(`Output written to: ${OUTPUT_FILE}`)
    console.log(`Output size: ${(eventOutput.length / 1024 / 1024).toFixed(2)} MB`)
  } catch (error) {
    console.error('Error:', error.message)
    process.exit(1)
  }
}

main()
