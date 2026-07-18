/* eslint-disable */
/**
 * Startup validation of per-event configuration against the actual events data.
 *
 * All special-casing in this pipeline is keyed by exact event-name strings. If an event
 * is renamed upstream (or a config entry has a typo), the special-casing silently stops
 * applying — trees still build, just wrong. This check turns that failure mode into a
 * hard error at startup, before any parsing work happens.
 */
const EVENT_ALTERATIONS = require('./event-alterations.js')
const {
  DEFAULT_NODE_BLACKLIST,
  OPTIMIZATION_PASS_CONFIG,
  VALIDATION_IGNORE_RULES,
} = require('./configs.js')

/**
 * Every place a config entry is keyed by an exact event name.
 */
function collectConfiguredEventNames() {
  const cfg = OPTIMIZATION_PASS_CONFIG
  return [
    { source: 'configs.js DIALOGUE_MENU_EVENTS', names: Object.keys(cfg.DIALOGUE_MENU_EVENTS) },
    { source: 'configs.js PATH_CONVERGENCE', names: Object.keys(cfg.PATH_CONVERGENCE) },
    { source: 'configs.js DEFAULT_NODE_BLACKLIST', names: DEFAULT_NODE_BLACKLIST },
    {
      source: 'configs.js POST_PROCESSING_HUB_PATTERN_OPTIMIZATION_BLACKLIST',
      names: cfg.POST_PROCESSING_HUB_PATTERN_OPTIMIZATION_BLACKLIST,
    },
    { source: 'configs.js COUSIN_REF_BLACKLIST', names: cfg.COUSIN_REF_BLACKLIST },
    { source: 'configs.js COMPLEX_COUSIN_REF_BLACKLIST', names: cfg.COMPLEX_COUSIN_REF_BLACKLIST },
    {
      source: 'configs.js DEDUPLICATE_SUBTREES_EVENT_BLACKLIST',
      names: cfg.DEDUPLICATE_SUBTREES_EVENT_BLACKLIST,
    },
    { source: 'configs.js VALIDATION_IGNORE_RULES', names: Object.keys(VALIDATION_IGNORE_RULES) },
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
  for (const [eventName, menuConfig] of Object.entries(
    OPTIMIZATION_PASS_CONFIG.DIALOGUE_MENU_EVENTS
  )) {
    const threshold = menuConfig.hubChoiceMatchThreshold
    if (threshold !== undefined && !(threshold > 0 && threshold <= 100)) {
      problems.push(
        `"${eventName}" (configs.js DIALOGUE_MENU_EVENTS): hubChoiceMatchThreshold=${threshold} must be in (0, 100]`
      )
    }
  }

  if (problems.length > 0) {
    console.error('\n❌ ═══════════════ CONFIG VALIDATION FAILED ═══════════════')
    console.error('The following per-event config entries do not resolve:')
    problems.forEach((problem) => console.error(`  - ${problem}`))
    console.error('Fix the entry (or remove it if the event no longer exists) and re-run.')
    console.error('═══════════════════════════════════════════════════════════')
    throw new Error(`Config validation failed: ${problems.length} unresolved entr${problems.length === 1 ? 'y' : 'ies'}`)
  }

  console.log(`✅ Config validation: all ${totalEntries} per-event config entries resolve`)
}

module.exports = { validateEventConfigs }
