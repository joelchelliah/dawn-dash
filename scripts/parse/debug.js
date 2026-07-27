/**
 * Shared debug configuration for the parse pipeline.
 *
 * The entry point (parse-event-trees.js) sets `eventName` from the --debug CLI flag;
 * the other modules read it to enable detailed per-event logging.
 */
const debugConfig = {
  eventName: '',
}

/**
 * Registry of non-fatal parse failures: features that degrade silently when the Ink
 * JSON layout shifts (random-var detection, function-definition parsing, ...). Trees
 * still build without them, just with worse content — so instead of swallowing the
 * errors, each failure is recorded here and the entry point prints a summary at the
 * end of the run. Full error + stack is printed immediately when --debug matches.
 */
const parseFailures = new Map() // category -> Map<eventName, count>

function recordParseFailure(category, eventName, error) {
  if (!parseFailures.has(category)) {
    parseFailures.set(category, new Map())
  }
  const byEvent = parseFailures.get(category)
  byEvent.set(eventName, (byEvent.get(eventName) || 0) + 1)

  if (eventName === debugConfig.eventName) {
    console.warn(`  ⚠️  ${category} failed for "${eventName}": ${error.message}`)
    console.warn(error.stack)
  }
}

/**
 * Print the per-category failure summary (no-op when nothing was recorded).
 * A healthy run prints nothing.
 */
function printParseFailureSummary() {
  if (parseFailures.size === 0) return
  console.warn('\n⚠️  Non-fatal parse failures (trees still built, but features degraded):')
  parseFailures.forEach((byEvent, category) => {
    const events = Array.from(byEvent.keys())
    console.warn(`  - ${category} failed for ${events.length} event(s): ${events.join(', ')}`)
  })
  console.warn('  Re-run with --debug "<event name>" for full errors and stack traces.')
}

module.exports = { debugConfig, recordParseFailure, printParseFailureSummary }
