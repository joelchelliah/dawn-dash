#!/usr/bin/env node

/**
 * Sync events data from Blightbane and parse event trees
 *
 * This script runs the complete event data pipeline:
 * 1. Fetch events data from Blightbane (fetch-events-data-from-blightbane.js)
 * 2. Extract events from the bundle dump (extract-events.js)
 * 3. Parse event trees from the extracted events (parse/parse-event-trees.js)
 *
 * Each step only runs if the previous step succeeds.
 */

const { spawn } = require('child_process')
const path = require('path')

const scripts = [
  {
    name: 'Fetch events data from Blightbane',
    path: path.join(__dirname, 'fetch-events-data-from-blightbane.js'),
  },
  {
    name: 'Extract events',
    path: path.join(__dirname, 'extract-events.js'),
  },
  {
    name: 'Parse event trees',
    path: path.join(__dirname, 'parse/parse-event-trees.js'),
  },
]

/**
 * Run a script and return a promise that resolves/rejects based on exit code
 */
function runScript(scriptPath, scriptName) {
  return new Promise((resolve, reject) => {
    console.log(`\n${'='.repeat(80)}`)
    console.log(`📝 Running: ${scriptName}`)
    console.log(`${'='.repeat(80)}\n`)

    const child = spawn('node', [scriptPath], {
      stdio: 'inherit',
      cwd: path.dirname(scriptPath),
    })

    child.on('error', (error) => {
      reject(new Error(`Failed to start script: ${error.message}`))
    })

    child.on('exit', (code) => {
      if (code === 0) {
        console.log(`\n✅ ${scriptName} completed successfully\n`)
        resolve()
      } else {
        reject(new Error(`${scriptName} failed with exit code ${code}`))
      }
    })
  })
}

/**
 * Run all scripts in sequence
 */
async function runPipeline() {
  const startTime = Date.now()

  try {
    for (let i = 0; i < scripts.length; i++) {
      const { name, path: scriptPath } = scripts[i]
      await runScript(scriptPath, name)
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2)
    console.log(`\n${'='.repeat(80)}`)
    console.log(`🎉 All scripts completed successfully in ${duration}s`)
    console.log(`${'='.repeat(80)}\n`)
    process.exit(0)
  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2)
    console.error(`\n${'='.repeat(80)}`)
    console.error(`❌ Pipeline failed after ${duration}s`)
    console.error(`Error: ${error.message}`)
    console.error(`${'='.repeat(80)}\n`)
    process.exit(1)
  }
}

// Run the pipeline
runPipeline()
