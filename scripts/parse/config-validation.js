/**
 * Startup validation of per-event configuration against the actual events data.
 *
 * All special-casing in this pipeline is keyed by exact event-name strings. If an event
 * is renamed upstream (or a config entry has a typo), the special-casing silently stops
 * applying — trees still build, just wrong. This check turns that failure mode into a
 * hard error at startup, before any parsing work happens.
 */
const {
  DIALOGUE_MENU_EVENTS,
  PATH_CONVERGENCE,
  DEFAULT_NODE_BLACKLIST,
  POST_PROCESSING_HUB_PATTERN_OPTIMIZATION_BLACKLIST,
  COUSIN_REF_BLACKLIST,
  COMPLEX_COUSIN_REF_BLACKLIST,
  VALIDATION_IGNORE_RULES,
  EVENT_NAME_ALIASES,
  DEPRECATED_EVENTS,
  EVENT_ALTERATIONS,
} = require('./event-overrides.js')

/**
 * Every place a config entry is keyed by an exact event name
 * (all in event-overrides.js — new per-event structures must be registered here).
 */
function collectConfiguredEventNames() {
  const src = (name) => `event-overrides.js ${name}`
  return [
    { source: src('DIALOGUE_MENU_EVENTS'), names: Object.keys(DIALOGUE_MENU_EVENTS) },
    { source: src('PATH_CONVERGENCE'), names: Object.keys(PATH_CONVERGENCE) },
    { source: src('DEFAULT_NODE_BLACKLIST'), names: DEFAULT_NODE_BLACKLIST },
    {
      source: src('POST_PROCESSING_HUB_PATTERN_OPTIMIZATION_BLACKLIST'),
      names: POST_PROCESSING_HUB_PATTERN_OPTIMIZATION_BLACKLIST,
    },
    { source: src('COUSIN_REF_BLACKLIST'), names: COUSIN_REF_BLACKLIST },
    { source: src('COMPLEX_COUSIN_REF_BLACKLIST'), names: COMPLEX_COUSIN_REF_BLACKLIST },
    { source: src('VALIDATION_IGNORE_RULES'), names: Object.keys(VALIDATION_IGNORE_RULES) },
    { source: src('EVENT_NAME_ALIASES'), names: Object.keys(EVENT_NAME_ALIASES) },
    { source: src('DEPRECATED_EVENTS'), names: DEPRECATED_EVENTS },
    { source: 'event-alterations.js', names: EVENT_ALTERATIONS.map((a) => a.name) },
  ]
}

/**
 * Verify that every configured event name resolves to a parseable event, and that
 * config values are sane. Throws on any problem (fails the run before parsing starts).
 *
 * @param {Set<string>} parseableEventNames - Display names of all events that have text content
 */
function validateEventConfigs(parseableEventNames) {
  const problems = []
  let totalEntries = 0

  for (const { source, names } of collectConfiguredEventNames()) {
    for (const name of names) {
      totalEntries++
      if (!parseableEventNames.has(name)) {
        problems.push(`"${name}" (${source}) does not match any parseable event`)
      }
    }
  }

  // hubChoiceMatchThreshold must be a percentage in (0, 100]
  for (const [eventName, menuConfig] of Object.entries(DIALOGUE_MENU_EVENTS)) {
    const threshold = menuConfig.hubChoiceMatchThreshold
    if (threshold !== undefined && !(threshold > 0 && threshold <= 100)) {
      problems.push(
        `"${eventName}" (event-overrides.js DIALOGUE_MENU_EVENTS): hubChoiceMatchThreshold=${threshold} must be in (0, 100]`
      )
    }
  }

  if (problems.length > 0) {
    console.error('\n❌ ═══════════════ CONFIG VALIDATION FAILED ═══════════════')
    console.error('The following per-event config entries do not resolve:')
    problems.forEach((problem) => console.error(`  - ${problem}`))
    console.error('Fix the entry (or remove it if the event no longer exists) and re-run.')
    console.error('═══════════════════════════════════════════════════════════')
    throw new Error(
      `Config validation failed: ${problems.length} unresolved entr${problems.length === 1 ? 'y' : 'ies'}`
    )
  }

  console.log(`✅ Config validation: all ${totalEntries} per-event config entries resolve`)
}

module.exports = { validateEventConfigs }
