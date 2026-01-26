const fs = require('fs')
const path = require('path')

const events = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'events.json'), 'utf8'))

const findings = []
const stats = {
  totalEvents: events.length,
  withIssues: 0,
  byType: {}
}

// Analyze each event
events.forEach(event => {
  const eventName = event.name
  const inkTextStr = event.text || '{}'

  let inkJson
  try {
    inkJson = JSON.parse(inkTextStr)
  } catch (e) {
    console.error(`Failed to parse Ink JSON for event: ${eventName}`)
    return
  }

  const eventFindings = {
    name: eventName,
    issues: []
  }

  // Extract root array
  const root = inkJson.root || []
  if (!Array.isArray(root)) return

  // Find all "done" positions
  const doneIndices = []
  root.forEach((item, idx) => {
    if (item === 'done') {
      doneIndices.push(idx)
    }
  })

  // Check for knots after DONE (like Frozen Heart)
  if (doneIndices.length > 0) {
    const firstDone = doneIndices[0]
    const afterDone = root[firstDone + 1]

    if (typeof afterDone === 'object' && afterDone !== null) {
      const knotsAfterDone = Object.keys(afterDone).filter(k => !k.startsWith('#'))

      if (knotsAfterDone.length > 0) {
        eventFindings.issues.push({
          type: 'External Dependencies',
          description: `${knotsAfterDone.length} knot(s) after DONE: ${knotsAfterDone.join(', ')}`,
          sample: '',
          impact: 'Only accessible via external divert (game trigger)',
          suggestedFix: `Add forced exploration in event-alterations.js: ${knotsAfterDone.join(', ')}`
        })
      }
    }
  }

  // Recursively search for game triggers, quest flags, and talent checks
  function searchPatterns(obj, depth = 0) {
    if (depth > 20) return { triggers: [], questFlags: [], talents: [], knots: [] }

    const results = { triggers: [], questFlags: [], talents: [], knots: [] }

    if (typeof obj === 'string') {
      // Game triggers
      if (obj.startsWith('>>>') || obj.startsWith('>>>>')) {
        results.triggers.push(obj)
      }

      // Quest flags
      const questFlagMatch = obj.match(/!?questflag:(\w+)/)
      if (questFlagMatch) {
        results.questFlags.push(questFlagMatch[1])
      }

      // Talent checks
      const talentMatch = obj.match(/!?talent:(\w+)/)
      if (talentMatch) {
        results.talents.push(talentMatch[1])
      }
    } else if (Array.isArray(obj)) {
      obj.forEach(item => {
        const childResults = searchPatterns(item, depth + 1)
        results.triggers.push(...childResults.triggers)
        results.questFlags.push(...childResults.questFlags)
        results.talents.push(...childResults.talents)
        results.knots.push(...childResults.knots)
      })
    } else if (typeof obj === 'object' && obj !== null) {
      // Check if this is a named knot
      if (obj['#n']) {
        results.knots.push(obj['#n'])
      }

      Object.values(obj).forEach(value => {
        const childResults = searchPatterns(value, depth + 1)
        results.triggers.push(...childResults.triggers)
        results.questFlags.push(...childResults.questFlags)
        results.talents.push(...childResults.talents)
        results.knots.push(...childResults.knots)
      })
    }

    return results
  }

  const patterns = searchPatterns(inkJson)

  // Analyze game triggers
  if (patterns.triggers.length > 0) {
    const uniqueTriggers = [...new Set(patterns.triggers)]
    const triggerTypes = {
      battle: uniqueTriggers.filter(t => /BATTLE|FIGHT|COMBAT/i.test(t)),
      puzzle: uniqueTriggers.filter(t => /PUZZLE/i.test(t)),
      quest: uniqueTriggers.filter(t => /QUESTFLAG/i.test(t)),
      gold: uniqueTriggers.filter(t => /gold:/i.test(t)),
      card: uniqueTriggers.filter(t => /ADDCARD|REMOVECARD|TRADE|UPGRADE|MEMORIZE|IMBUE/i.test(t)),
      heal: uniqueTriggers.filter(t => /HEAL/i.test(t)),
      other: []
    }

    triggerTypes.other = uniqueTriggers.filter(t =>
      !triggerTypes.battle.includes(t) &&
      !triggerTypes.puzzle.includes(t) &&
      !triggerTypes.quest.includes(t) &&
      !triggerTypes.gold.includes(t) &&
      !triggerTypes.card.includes(t) &&
      !triggerTypes.heal.includes(t)
    )

    let summary = []
    if (triggerTypes.battle.length > 0) summary.push(`${triggerTypes.battle.length} battle`)
    if (triggerTypes.puzzle.length > 0) summary.push(`${triggerTypes.puzzle.length} puzzle`)
    if (triggerTypes.quest.length > 0) summary.push(`${triggerTypes.quest.length} quest`)
    if (triggerTypes.gold.length > 0) summary.push(`${triggerTypes.gold.length} gold`)
    if (triggerTypes.card.length > 0) summary.push(`${triggerTypes.card.length} card`)
    if (triggerTypes.heal.length > 0) summary.push(`${triggerTypes.heal.length} heal`)
    if (triggerTypes.other.length > 0) summary.push(`${triggerTypes.other.length} other`)

    eventFindings.issues.push({
      type: 'Game Triggers',
      description: `${uniqueTriggers.length} trigger(s): ${summary.join(', ')}`,
      sample: uniqueTriggers.slice(0, 5).join('\n'),
      impact: 'Game state modifications',
      suggestedFix: 'Verify all trigger-dependent paths are explored'
    })
  }

  // Analyze quest flags
  if (patterns.questFlags.length > 0) {
    const uniqueFlags = [...new Set(patterns.questFlags)]
    eventFindings.issues.push({
      type: 'Conditional Logic',
      description: `Uses ${uniqueFlags.length} quest flag(s): ${uniqueFlags.join(', ')}`,
      sample: uniqueFlags.slice(0, 5).join(', '),
      impact: 'Branches gated by quest progression',
      suggestedFix: 'Ensure all quest flag branches are explored'
    })
  }

  // Analyze talent checks
  if (patterns.talents.length > 0) {
    const uniqueTalents = [...new Set(patterns.talents)]
    eventFindings.issues.push({
      type: 'Conditional Logic',
      description: `Uses ${uniqueTalents.length} talent check(s): ${uniqueTalents.join(', ')}`,
      sample: uniqueTalents.slice(0, 5).join(', '),
      impact: 'Branches gated by character build',
      suggestedFix: 'Ensure all talent-dependent branches are explored'
    })
  }

  // Analyze special knots
  const specialKnots = patterns.knots.filter(name =>
    /puzzle|success|fail|complete|victory|defeat|reward|penalty/i.test(name)
  )

  if (specialKnots.length > 0) {
    eventFindings.issues.push({
      type: 'Special Knots',
      description: `Contains special knots: ${[...new Set(specialKnots)].join(', ')}`,
      sample: '',
      impact: 'Knots with special names may require external triggers',
      suggestedFix: `Review accessibility of: ${[...new Set(specialKnots)].join(', ')}`
    })
  }

  // Only add if there are issues
  if (eventFindings.issues.length > 0) {
    findings.push(eventFindings)
    stats.withIssues++

    // Count by type
    eventFindings.issues.forEach(issue => {
      stats.byType[issue.type] = (stats.byType[issue.type] || 0) + 1
    })
  }
})

// Generate markdown report
let markdown = `# Hidden Ink Mechanics Analysis\n\n`
markdown += `**Analysis Date**: ${new Date().toISOString().split('T')[0]}\n`
markdown += `**Total Events Analyzed**: ${stats.totalEvents}\n`
markdown += `**Events with Potential Issues**: ${stats.withIssues}\n`
markdown += `**Clean Events**: ${stats.totalEvents - stats.withIssues}\n\n`

markdown += `## Executive Summary\n\n`
markdown += `This analysis identifies Ink mechanics that may not be captured by standard tree parsing. `
markdown += `The parser processes events linearly but some events have hidden branches only accessible `
markdown += `through external game triggers (like puzzle completion callbacks).\n\n`

markdown += `### Issues by Type\n\n`
Object.keys(stats.byType).sort().forEach(type => {
  markdown += `- **${type}**: ${stats.byType[type]} occurrences\n`
})

markdown += `\n## CRITICAL: Knots After DONE\n\n`

// Highlight events with knots after DONE (highest priority)
const knotsAfterDone = findings.filter(f =>
  f.issues.some(i => i.type === 'External Dependencies' && i.description.includes('after DONE'))
)

if (knotsAfterDone.length > 0) {
  markdown += `**${knotsAfterDone.length} events** have knots defined after the main DONE statement. `
  markdown += `These knots are NOT explored by the standard parser and require special handling.\n\n`
  markdown += `**This is the same pattern as Frozen Heart which was just fixed.**\n\n`

  knotsAfterDone.forEach(finding => {
    const issue = finding.issues.find(i => i.type === 'External Dependencies' && i.description.includes('after DONE'))
    if (issue) {
      markdown += `### ${finding.name}\n`
      markdown += `- ${issue.description}\n`
      markdown += `- **Impact**: ${issue.impact}\n`
      markdown += `- **Fix**: ${issue.suggestedFix}\n\n`
    }
  })
} else {
  markdown += `No events found with this pattern.\n\n`
}

markdown += `\n## High Priority: Special Knots\n\n`

const specialKnotEvents = findings.filter(f =>
  f.issues.some(i => i.type === 'Special Knots')
)

if (specialKnotEvents.length > 0) {
  markdown += `**${specialKnotEvents.length} events** contain knots with special names (puzzle, success, fail, etc.). `
  markdown += `These may indicate challenge mechanics that require external triggers.\n\n`

  specialKnotEvents.forEach(finding => {
    const issue = finding.issues.find(i => i.type === 'Special Knots')
    if (issue) {
      markdown += `### ${finding.name}\n`
      markdown += `- ${issue.description}\n`
      markdown += `- **Fix**: ${issue.suggestedFix}\n\n`
    }
  })
}

markdown += `\n## Medium Priority: Conditional Logic\n\n`

const conditionalEvents = findings.filter(f =>
  f.issues.some(i => i.type === 'Conditional Logic')
)

markdown += `**${conditionalEvents.length} events** use quest flags or talent checks to gate content. `
markdown += `The parser should explore all branches regardless of prerequisites.\n\n`

markdown += `<details>\n<summary>Click to expand list of ${conditionalEvents.length} events</summary>\n\n`
conditionalEvents.forEach(finding => {
  const conditionalIssues = finding.issues.filter(i => i.type === 'Conditional Logic')
  markdown += `**${finding.name}**: `
  markdown += conditionalIssues.map(i => i.description).join('; ')
  markdown += `\n\n`
})
markdown += `</details>\n\n`

markdown += `\n## Game Triggers Reference\n\n`

const triggerEvents = findings.filter(f =>
  f.issues.some(i => i.type === 'Game Triggers')
)

markdown += `**${triggerEvents.length} events** use game triggers. These modify game state but shouldn't prevent exploration.\n\n`

markdown += `<details>\n<summary>Click to expand list of ${triggerEvents.length} events</summary>\n\n`
triggerEvents.forEach(finding => {
  const triggerIssue = finding.issues.find(i => i.type === 'Game Triggers')
  if (triggerIssue) {
    markdown += `**${finding.name}**: ${triggerIssue.description}\n\n`
  }
})
markdown += `</details>\n\n`

markdown += `\n---\n\n## Complete Event Index (Alphabetical)\n\n`

findings.sort((a, b) => a.name.localeCompare(b.name)).forEach(finding => {
  markdown += `### ${finding.name}\n\n`
  finding.issues.forEach(issue => {
    markdown += `- **[${issue.type}]** ${issue.description}\n`
  })
  markdown += `\n`
})

markdown += `\n---\n\n## Events Ranked by Issue Count\n\n`

const ranked = findings
  .map(f => ({ name: f.name, count: f.issues.length, issues: f.issues }))
  .sort((a, b) => b.count - a.count)

markdown += `| # | Event Name | Issues | Types |\n`
markdown += `|---|------------|--------|-------|\n`
ranked.forEach((e, idx) => {
  const types = [...new Set(e.issues.map(i => i.type))].join(', ')
  markdown += `| ${idx + 1} | ${e.name} | ${e.count} | ${types} |\n`
})

// Write to file
const outputPath = path.join(__dirname, 'optimizationIdeas', 'potentially-hidden-ink-mechanics.md')
fs.mkdirSync(path.dirname(outputPath), { recursive: true })
fs.writeFileSync(outputPath, markdown)

console.log(`\n✓ Analysis complete!`)
console.log(`\nStatistics:`)
console.log(`  Total events: ${stats.totalEvents}`)
console.log(`  Events with issues: ${stats.withIssues}`)
console.log(`  Clean events: ${stats.totalEvents - stats.withIssues}`)
console.log(`\n  CRITICAL - Knots after DONE: ${knotsAfterDone.length}`)
console.log(`  High Priority - Special Knots: ${specialKnotEvents.length}`)
console.log(`  Medium Priority - Conditional Logic: ${conditionalEvents.length}`)
console.log(`  Info - Game Triggers: ${triggerEvents.length}`)
console.log(`\n✓ Report written to: ${outputPath}`)
