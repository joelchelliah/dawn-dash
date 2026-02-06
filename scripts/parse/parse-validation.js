/* eslint-disable */
const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

/**
 * Builds a map of line number -> event name for event-trees.json content.
 * @param {string} content - File content
 * @returns {Map<number, string>}
 */
function buildLineToEventMap(content) {
  const lines = content.split('\n')
  const map = new Map()
  const nameLineMatches = []

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^\s*"name"\s*:\s*"([^"]+)"/)
    if (match) {
      nameLineMatches.push({ line: i + 1, name: match[1] })
    }
  }

  for (let j = 0; j < nameLineMatches.length; j++) {
    const start = j === 0 ? 1 : nameLineMatches[j].line - 1
    const end = j < nameLineMatches.length - 1 ? nameLineMatches[j + 1].line - 2 : lines.length
    const eventName = nameLineMatches[j].name
    for (let lineNum = start; lineNum <= end; lineNum++) {
      map.set(lineNum, eventName)
    }
  }
  return map
}

/**
 * Checks if a line should be ignored based on validation rules.
 * @param {string} content - The line content (without diff prefix)
 * @param {string[]} recentLines - Recent lines from the diff for context checking
 */
function shouldIgnoreLine(content, recentLines = []) {
  // Ignore id field changes (id, ref, refChildren)
  if (/^\s*"(id|ref|refChildren)"\s*:\s*/.test(content.trim())) {
    return true
  }
  // Ignore numeric ID lines that appear to be in refChildren arrays
  if (/^\s*\d+\s*,?\s*$/.test(content.trim())) {
    for (let j = recentLines.length - 1; j >= 0 && j >= recentLines.length - 30; j--) {
      const recentLine = recentLines[j]
      const recentContent =
        recentLine.startsWith('+') || recentLine.startsWith('-') || recentLine.startsWith(' ')
          ? recentLine.substring(1)
          : recentLine
      if (recentContent.includes('"refChildren"')) {
        return true
      }
      if (/^\s*\]/.test(recentContent.trim()) && !recentContent.includes('"refChildren"')) {
        let foundRefChildren = false
        for (let k = j - 1; k >= 0 && k >= j - 20; k--) {
          const checkLine = recentLines[k]
          const checkContent =
            checkLine.startsWith('+') || checkLine.startsWith('-') || checkLine.startsWith(' ')
              ? checkLine.substring(1)
              : checkLine
          if (checkContent.includes('"refChildren"')) {
            foundRefChildren = true
            break
          }
        }
        if (!foundRefChildren) {
          break
        }
      }
    }
  }
  // Ignore specific text line
  if (content.includes('"text": "A skeleton in highly oxidised')) return true
  // Ignore changes to text or choiceLabel fields starting with specific strings
  const ignoredPrefixes = [
    'Focus on the Blacksmith',
    'Focus on the Forger',
    'Focus on the Succubus',
    'Focus on the Alchemist',
    'Focus on the Collector',
    'Focus on the Consul',
    'Focus on the Necromancer',
    'Focus on the Priestess',
  ]
  const textMatch = content.match(/^\s*"text"\s*:\s*"([^"]+)"/)
  const choiceLabelMatch = content.match(/^\s*"choiceLabel"\s*:\s*"([^"]+)"/)
  if (textMatch || choiceLabelMatch) {
    const value = (textMatch || choiceLabelMatch)[1]
    if (ignoredPrefixes.some((prefix) => value.startsWith(prefix))) return true
  }
  return false
}

/**
 * Outputs names of events that have non-ignored diff lines.
 * Compares committed vs current event-trees.json, ignores id/ref/refChildren changes.
 */
function validateEventTreesChanges() {
  const filePath = path.join(__dirname, '../../src/codex/data/event-trees.json')
  const relativePath = path.relative(process.cwd(), filePath)

  try {
    const diff = execSync(`git -c color.diff=never diff --no-ext-diff HEAD -- "${relativePath}"`, {
      encoding: 'utf-8',
      cwd: process.cwd(),
      maxBuffer: 10 * 1024 * 1024,
    })

    if (!diff.trim()) {
      console.log('No changes detected in event-trees.json')
      return
    }

    const currentContent = fs.readFileSync(filePath, 'utf-8')
    const committedContent = execSync(`git show HEAD:${relativePath}`, {
      encoding: 'utf-8',
      cwd: process.cwd(),
      maxBuffer: 10 * 1024 * 1024,
    })

    const currentLineToEvent = buildLineToEventMap(currentContent)
    const committedLineToEvent = buildLineToEventMap(committedContent)

    const lines = diff.split('\n')
    const affectedEvents = new Set()
    let oldLineNumber = null
    let newLineNumber = null
    const recentLines = []

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]

      if (line.startsWith('---') || line.startsWith('+++') || line.startsWith('\\')) {
        continue
      }

      if (line.startsWith('@@')) {
        const match = line.match(/^@@ -(\d+),\d+ \+(\d+),\d+ @@/)
        if (match) {
          oldLineNumber = parseInt(match[1], 10) - 1
          newLineNumber = parseInt(match[2], 10) - 1
          recentLines.length = 0
        }
        continue
      }

      if (oldLineNumber === null || newLineNumber === null) continue

      recentLines.push(line)
      if (recentLines.length > 50) recentLines.shift()

      if (line.startsWith('-') && !line.startsWith('---')) {
        const nextLine = i + 1 < lines.length ? lines[i + 1] : ''
        const isModification = nextLine.startsWith('+') && !nextLine.startsWith('+++')

        if (!isModification) {
          const content = line.substring(1)
          if (!shouldIgnoreLine(content, recentLines)) {
            const event = committedLineToEvent.get(oldLineNumber + 1)
            if (event) affectedEvents.add(event)
          }
        }
        oldLineNumber++
      }

      if (line.startsWith('+') && !line.startsWith('+++')) {
        const content = line.substring(1)
        const prevLine = i > 0 ? lines[i - 1] : ''
        const isModification = prevLine.startsWith('-') && !prevLine.startsWith('---')

        if (isModification) {
          const removedContent = prevLine.substring(1)
          const oldShouldIgnore = shouldIgnoreLine(removedContent, recentLines)
          const newShouldIgnore = shouldIgnoreLine(content, recentLines)
          if (!oldShouldIgnore || !newShouldIgnore) {
            const oldEvent = committedLineToEvent.get(oldLineNumber)
            const newEvent = currentLineToEvent.get(newLineNumber + 1)
            if (oldEvent) affectedEvents.add(oldEvent)
            if (newEvent) affectedEvents.add(newEvent)
          }
        } else {
          if (!shouldIgnoreLine(content, recentLines)) {
            const event = currentLineToEvent.get(newLineNumber + 1)
            if (event) affectedEvents.add(event)
          }
        }
        newLineNumber++
      }

      if (line.startsWith(' ')) {
        oldLineNumber++
        newLineNumber++
      }
    }

    if (affectedEvents.size > 0) {
      ;[...affectedEvents].sort().forEach((name) => console.log(name))
    }
  } catch (error) {
    if (error.message.includes('not a git repository') || error.message.includes('No such file')) {
      return
    }
    throw error
  }
}

module.exports = { validateEventTreesChanges }
