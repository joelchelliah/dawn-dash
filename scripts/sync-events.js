#!/usr/bin/env node

/**
 * Sync events data and parse event trees
 *
 * Default (external-tool source):
 * 1. Parse event trees from scripts/data/events.json (parse/parse-event-trees.js)
 *
 * With --from-dump (legacy in-repo source):
 * 1. Fetch events data from Blightbane (fetch-events-data-from-blightbane.js)
 * 2. Extract events from the bundle dump into events-from-dump.json (extract-events.js)
 * 3. Parse event trees from events-from-dump.json (parse/parse-event-trees.js)
 *
 * scripts/data/events.json is produced by an external event-extraction tool and pasted in;
 * nothing in this repo writes it, so the default path is parse-only. The dump pipeline writes
 * its own events-from-dump.json and never overwrites the external tool's file.
 *
 * Each step only runs if the previous step succeeds.
 */

const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')

const args = process.argv.slice(2)
const fromDump = args.includes('--from-dump')

const EVENTS_FILE = path.join(__dirname, 'data', fromDump ? 'events-from-dump.json' : 'events.json')

const dumpScripts = [
  {
    name: 'Fetch events data from Blightbane',
    path: path.join(__dirname, 'fetch-events-data-from-blightbane.js'),
  },
  {
    name: 'Extract events',
    path: path.join(__dirname, 'extract-events.js'),
  },
]

const parseScript = {
  name: 'Parse event trees',
  path: path.join(__dirname, 'parse/parse-event-trees.js'),
  // CLI flags passed to sync-events.js (--debug, --only, --dry-run, --baseline, --from-dump)
  // are forwarded to the parse step only
  forwardArgs: true,
}

const scripts = fromDump ? [...dumpScripts, parseScript] : [parseScript]

/**
 * Run a script and return a promise that resolves/rejects based on exit code
 */
function runScript(scriptPath, scriptName, args = []) {
  return new Promise((resolve, reject) => {
    console.log(`\n${'='.repeat(80)}`)
    console.log(`📝 Running: ${scriptName}`)
    console.log(`${'='.repeat(80)}\n`)

    const child = spawn('node', [scriptPath, ...args], {
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

  // Only meaningful in the default path: the dump path generates its input as step 2.
  if (!fromDump && !fs.existsSync(EVENTS_FILE)) {
    console.error(`\n❌ Events file not found: ${EVENTS_FILE}`)
    console.error(
      '   Generate it with the external event-extraction tool and place it at that path,\n' +
        '   or run with --from-dump to scrape the Blightbane bundle instead.\n'
    )
    process.exit(1)
  }

  console.log(
    fromDump
      ? '\n🔧 Source: Blightbane bundle dump (--from-dump) -> data/events-from-dump.json'
      : '\n🔧 Source: data/events.json (external event-extraction tool)'
  )

  try {
    for (let i = 0; i < scripts.length; i++) {
      const { name, path: scriptPath, forwardArgs } = scripts[i]
      await runScript(scriptPath, name, forwardArgs ? args : [])
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
