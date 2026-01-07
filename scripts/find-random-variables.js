#!/usr/bin/env node

/**
 * Script to find all random variable assignments in Ink stories
 * Searches for patterns like: ["ev", minValue, maxValue, "rnd", "/ev", {"VAR=": "varName"}]
 */

const fs = require('fs')
const path = require('path')

const EVENTS_FILE = path.join(__dirname, 'events.json')

/**
 * Detect all random variable assignments in an Ink JSON string
 * Returns array of objects: { varName, min, max, eventName }
 */
function findRandomVariables(inkJsonString, eventName) {
  const randomVars = []

  try {
    const inkJson = JSON.parse(inkJsonString)

    // Recursive function to traverse the Ink JSON structure
    function traverse(node) {
      if (Array.isArray(node)) {
        // Look for pattern: ["ev", minValue, maxValue, "rnd", "/ev", {"VAR=": "varName", ...}]
        // This represents: VAR = random(min, max)
        for (let i = 0; i < node.length - 3; i++) {
          if (
            node[i] === 'ev' &&
            typeof node[i + 1] === 'number' &&
            typeof node[i + 2] === 'number' &&
            node[i + 3] === 'rnd' &&
            node[i + 4] === '/ev' &&
            typeof node[i + 5] === 'object' &&
            node[i + 5] !== null &&
            'VAR=' in node[i + 5]
          ) {
            const varName = node[i + 5]['VAR=']
            const min = node[i + 1]
            const max = node[i + 2]
            randomVars.push({ varName, min, max, eventName })
          }
        }

        // Continue traversing
        node.forEach(traverse)
      } else if (typeof node === 'object' && node !== null) {
        Object.values(node).forEach(traverse)
      }
    }

    traverse(inkJson)
  } catch (error) {
    // Silently fail if JSON parsing fails
    console.warn(`  ⚠️  Failed to parse event "${eventName}": ${error.message}`)
  }

  return randomVars
}

// Main script
console.log('🔍 Analyzing events.json for random variable assignments...\n')

const eventsData = JSON.parse(fs.readFileSync(EVENTS_FILE, 'utf-8'))

// Collect all random variables across all events
const allRandomVars = []

eventsData.forEach((event) => {
  if (event.text) {
    const randomVars = findRandomVariables(event.text, event.name)
    allRandomVars.push(...randomVars)
  }
})

// Group by variable name
const byVarName = {}
allRandomVars.forEach(({ varName, min, max, eventName }) => {
  if (!byVarName[varName]) {
    byVarName[varName] = []
  }
  byVarName[varName].push({ min, max, eventName })
})

// Display results
console.log('📊 Summary of Random Variables:\n')

const sortedVarNames = Object.keys(byVarName).sort()

sortedVarNames.forEach((varName) => {
  const occurrences = byVarName[varName]
  console.log(`\n🎲 Variable: "${varName}" (${occurrences.length} occurrence${occurrences.length > 1 ? 's' : ''})`)

  // Group by unique ranges
  const rangeMap = {}
  occurrences.forEach(({ min, max, eventName }) => {
    const rangeKey = `${min}-${max}`
    if (!rangeMap[rangeKey]) {
      rangeMap[rangeKey] = []
    }
    rangeMap[rangeKey].push(eventName)
  })

  Object.entries(rangeMap).forEach(([rangeKey, events]) => {
    console.log(`   Range ${rangeKey}: ${events.length} event${events.length > 1 ? 's' : ''}`)
    events.forEach((eventName) => {
      console.log(`     - ${eventName}`)
    })
  })
})

console.log(`\n\n✅ Total: ${allRandomVars.length} random variable assignments across ${eventsData.length} events`)
console.log(`   Unique variable names: ${sortedVarNames.join(', ')}`)
