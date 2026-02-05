/* eslint-disable */
const { execSync } = require('child_process')
const path = require('path')

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
  // Check if line is just a number (with optional comma and whitespace)
  if (/^\s*\d+\s*,?\s*$/.test(content.trim())) {
    // Look backwards in recent lines to see if we're in a refChildren array
    for (let j = recentLines.length - 1; j >= 0 && j >= recentLines.length - 30; j--) {
      const recentLine = recentLines[j]
      const recentContent = recentLine.startsWith('+') || recentLine.startsWith('-') || recentLine.startsWith(' ')
        ? recentLine.substring(1)
        : recentLine
      if (recentContent.includes('"refChildren"')) {
        return true
      }
      // Stop if we hit a closing bracket that's not part of refChildren
      if (/^\s*\]/.test(recentContent.trim()) && !recentContent.includes('"refChildren"')) {
        // Check if there's a refChildren before this bracket
        let foundRefChildren = false
        for (let k = j - 1; k >= 0 && k >= j - 20; k--) {
          const checkLine = recentLines[k]
          const checkContent = checkLine.startsWith('+') || checkLine.startsWith('-') || checkLine.startsWith(' ')
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
  if (content.includes('"text": "A skeleton in highly oxidised')) {
    return true
  }
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
  // Check if this is a text or choiceLabel field
  const textMatch = content.match(/^\s*"text"\s*:\s*"([^"]+)"/)
  const choiceLabelMatch = content.match(/^\s*"choiceLabel"\s*:\s*"([^"]+)"/)
  if (textMatch || choiceLabelMatch) {
    const value = (textMatch || choiceLabelMatch)[1]
    if (ignoredPrefixes.some((prefix) => value.startsWith(prefix))) {
      return true
    }
  }
  return false
}

/**
 * Validates changes to event-trees.json by comparing with git committed version.
 * Ignores changes to id fields (id, ref, refChildren) and specific text line.
 */
function validateEventTreesChanges() {
  const filePath = path.join(__dirname, '../../src/codex/data/event-trees.json')
  const relativePath = path.relative(process.cwd(), filePath)

  try {
    // Get git diff of the file (disable colors and external diff tools to get standard unified diff format)
    const diff = execSync(`git -c color.diff=never diff --no-ext-diff HEAD -- "${relativePath}"`, {
      encoding: 'utf-8',
      cwd: process.cwd(),
    })

    if (!diff.trim()) {
      console.log('✅ No changes detected in event-trees.json')
      return
    }

    const lines = diff.split('\n')
    const warnings = []
    let oldLineNumber = null
    let newLineNumber = null
    const recentLines = [] // Keep track of recent lines for context

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]

      // Skip diff metadata lines
      if (line.startsWith('---') || line.startsWith('+++') || line.startsWith('\\')) {
        continue
      }

      // Track line numbers from hunk header: @@ -old_start,old_count +new_start,new_count @@
      if (line.startsWith('@@')) {
        const match = line.match(/^@@ -(\d+),\d+ \+(\d+),\d+ @@/)
        if (match) {
          oldLineNumber = parseInt(match[1], 10) - 1
          newLineNumber = parseInt(match[2], 10) - 1
          recentLines.length = 0 // Reset context on new hunk
        }
        continue
      }

      // Skip lines outside hunks
      if (oldLineNumber === null || newLineNumber === null) continue

      // Track recent lines for context (keep last 50 lines)
      recentLines.push(line)
      if (recentLines.length > 50) {
        recentLines.shift()
      }

      // Check for deletions (standalone, not part of modification)
      if (line.startsWith('-') && !line.startsWith('---')) {
        const nextLine = i + 1 < lines.length ? lines[i + 1] : ''
        const isModification = nextLine.startsWith('+') && !nextLine.startsWith('+++')

        // Only process standalone deletions (modifications are handled below)
        if (!isModification) {
          const content = line.substring(1)
          if (!shouldIgnoreLine(content, recentLines)) {
            warnings.push({
              line: oldLineNumber + 1,
              content: content.trim(),
              type: 'deleted',
            })
          }
        }
        // Deletions increment old file line number
        oldLineNumber++
      }

      // Check for additions or modifications
      if (line.startsWith('+') && !line.startsWith('+++')) {
        const content = line.substring(1)
        const prevLine = i > 0 ? lines[i - 1] : ''
        const isModification = prevLine.startsWith('-') && !prevLine.startsWith('---')

        if (isModification) {
          // For modifications, check both old and new lines
          const removedContent = prevLine.substring(1)
          const oldShouldIgnore = shouldIgnoreLine(removedContent, recentLines)
          const newShouldIgnore = shouldIgnoreLine(content, recentLines)

          // Only warn if at least one line shouldn't be ignored
          if (!oldShouldIgnore || !newShouldIgnore) {
            warnings.push({
              line: newLineNumber + 1,
              content: content.trim(),
              oldContent: removedContent.trim(),
              type: 'modified',
            })
          }
        } else {
          // For additions, check if should be ignored
          if (!shouldIgnoreLine(content, recentLines)) {
            warnings.push({
              line: newLineNumber + 1,
              content: content.trim(),
              type: 'added',
            })
          }
        }
        // Additions increment new file line number
        newLineNumber++
      }

      // Unchanged lines increment both
      if (line.startsWith(' ')) {
        oldLineNumber++
        newLineNumber++
      }
    }

    if (warnings.length > 0) {
      console.warn(`\n⚠️  Found ${warnings.length} non-ignored change(s) in event-trees.json:\n`)
      warnings.forEach(({ line, content, oldContent, type }) => {
        if (type === 'modified') {
          console.warn(`  Line ${line} (${type}):`)
          console.warn(
            `    - ${oldContent.substring(0, 100)}${oldContent.length > 100 ? '...' : ''}`
          )
          console.warn(`    + ${content.substring(0, 100)}${content.length > 100 ? '...' : ''}`)
        } else {
          console.warn(
            `  Line ${line} (${type}): ${content.substring(0, 100)}${content.length > 100 ? '...' : ''}`
          )
        }
      })
      console.warn('')
    } else {
      console.log('✅ All changes in event-trees.json are expected (id fields or ignored text)')
    }
  } catch (error) {
    // If file is not tracked by git or other git error, skip validation
    if (error.message.includes('not a git repository') || error.message.includes('No such file')) {
      console.log('⚠️  Skipping validation: file may not be tracked by git')
      return
    }
    throw error
  }
}

module.exports = { validateEventTreesChanges }
