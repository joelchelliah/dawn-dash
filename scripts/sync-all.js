#!/usr/bin/env node

/**
 * Run every sync script in sequence, with a clear banner and status per script.
 *
 * Exits 1 if any script failed, so CI and `&&` chains still see a failure.
 *
 * Usage:
 *   npm run sync-all
 */

const { spawn } = require('child_process')
const path = require('path')

const DIVIDER = '='.repeat(80)

const scripts = [
  { name: 'Sync treasures', path: path.join(__dirname, 'sync-treasures.js') },
  { name: 'Sync events', path: path.join(__dirname, 'sync-events.js') },
  { name: 'Talents preflight', path: path.join(__dirname, 'sync-talents-preflight.js') },
]

/**
 * Run a script to completion, resolving with its exit code rather than throwing,
 * so the caller can keep going and report on every script.
 */
function runScript(scriptPath, scriptName, index) {
  return new Promise((resolve) => {
    const startTime = Date.now()

    console.log(`\n${DIVIDER}`)
    console.log(`📝 [${index + 1}/${scripts.length}] ${scriptName}`)
    console.log(`${DIVIDER}\n`)

    const child = spawn('node', [scriptPath], {
      stdio: 'inherit',
      cwd: path.dirname(scriptPath),
    })

    const finish = (code, error) => {
      const duration = ((Date.now() - startTime) / 1000).toFixed(2)

      if (code === 0) {
        console.log(`\n✅ ${scriptName} completed successfully in ${duration}s`)
      } else {
        console.error(`\n❌ ${scriptName} failed after ${duration}s${error ? `: ${error}` : ''}`)
      }

      resolve({ name: scriptName, code, duration })
    }

    child.on('error', (error) => finish(1, error.message))
    child.on('exit', (code) => finish(code ?? 1))
  })
}

async function main() {
  const startTime = Date.now()
  const results = []

  console.log(`\n🔧 Running ${scripts.length} sync scripts`)

  for (let i = 0; i < scripts.length; i++) {
    const { name, path: scriptPath } = scripts[i]
    results.push(await runScript(scriptPath, name, i))
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2)
  const failed = results.filter((result) => result.code !== 0)

  console.log(`\n${DIVIDER}`)
  console.log('📊 Summary')
  console.log(`${DIVIDER}`)

  for (const result of results) {
    const status = result.code === 0 ? '✅ ok    ' : `❌ failed (exit ${result.code})`
    console.log(`   ${status}  ${result.name}  (${result.duration}s)`)
  }

  if (failed.length > 0) {
    console.error(`\n❌ ${failed.length} of ${results.length} scripts failed after ${duration}s\n`)
    process.exit(1)
  }

  console.log(`\n🎉 All ${results.length} scripts completed successfully in ${duration}s\n`)
  process.exit(0)
}

main()
