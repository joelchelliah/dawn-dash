/* eslint-disable */
/**
 * Structural validation of event-trees.json changes.
 *
 * Compares the freshly generated output against a baseline (git HEAD or a snapshot file)
 * as *structures*, not text lines:
 *
 * 1. Both files are parsed and every tree is deep-normalized:
 *    - `id` fields are stripped (node ids legitimately renumber every run)
 *    - each `ref` / `refChildren` value is replaced with a DESCRIPTOR of its target node
 *      (masked text/choiceLabel + path from the root) instead of the numeric id
 *    - known non-deterministic text (VALIDATION_IGNORE_RULES in configs.js) is masked
 * 2. The normalized trees are deep-compared per event.
 *
 * The target descriptors are the key correctness property: id renumbering stays invisible,
 * but a ref that silently starts pointing at a DIFFERENT target node — or a real subtree
 * collapsing into a ref — shows up as a failing event.
 */
const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const { VALIDATION_IGNORE_RULES } = require('./configs.js')

const MASKED_VALUE = '«nondeterministic»'

/**
 * Mask text/choiceLabel values that are known to differ between runs for this event
 */
function maskValue(value, ignoredPrefixes) {
  if (typeof value !== 'string') return value
  return ignoredPrefixes.some((prefix) => value.startsWith(prefix)) ? MASKED_VALUE : value
}

/**
 * Deep-normalize one event tree for comparison (see module doc for the rules)
 */
function normalizeTree(rootNode, ignoredPrefixes) {
  // First traversal: describe every node by its (masked) content and path from the root,
  // so refs can be compared by what they POINT AT instead of by numeric id
  const descriptorsById = new Map()
  const describe = (node, nodePath) => {
    if (!node) return
    const text = maskValue(node.text, ignoredPrefixes)
    const choiceLabel = maskValue(node.choiceLabel, ignoredPrefixes)
    descriptorsById.set(
      node.id,
      `target{path=${nodePath}, text=${JSON.stringify(text ?? null)}, choiceLabel=${JSON.stringify(choiceLabel ?? null)}}`
    )
    ;(node.children || []).forEach((child, i) => describe(child, `${nodePath}.${i}`))
  }
  describe(rootNode, 'root')

  const describeTarget = (id) => descriptorsById.get(id) || 'target{MISSING}'

  // Second traversal: build the normalized clone
  const normalize = (node) => {
    if (!node) return node
    const normalized = {}
    for (const key of Object.keys(node)) {
      if (key === 'id') continue
      else if (key === 'ref') normalized.ref = describeTarget(node.ref)
      else if (key === 'refChildren') normalized.refChildren = node.refChildren.map(describeTarget)
      else if (key === 'children') normalized.children = node.children.map(normalize)
      else if (key === 'text' || key === 'choiceLabel')
        normalized[key] = maskValue(node[key], ignoredPrefixes)
      else normalized[key] = node[key]
    }
    return normalized
  }
  return normalize(rootNode)
}

/**
 * Normalize a whole event entry (top-level fields + tree)
 */
function normalizeEvent(event) {
  const ignoredPrefixes = VALIDATION_IGNORE_RULES[event.name] || []
  const { rootNode, ...rest } = event
  return { ...rest, rootNode: normalizeTree(rootNode, ignoredPrefixes) }
}

/**
 * Deep-compare two normalized values; returns a description of the first
 * difference found (with its path), or null if they are identical.
 */
function findFirstDifference(a, b, currentPath = '') {
  if (a === b) return null
  if (a === null || b === null || typeof a !== typeof b || Array.isArray(a) !== Array.isArray(b)) {
    return { path: currentPath, baseline: a, current: b }
  }
  if (Array.isArray(a)) {
    if (a.length !== b.length) {
      return { path: `${currentPath}.length`, baseline: a.length, current: b.length }
    }
    for (let i = 0; i < a.length; i++) {
      const diff = findFirstDifference(a[i], b[i], `${currentPath}[${i}]`)
      if (diff) return diff
    }
    return null
  }
  if (typeof a === 'object') {
    const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])].sort()
    for (const key of keys) {
      const diff = findFirstDifference(a[key], b[key], currentPath ? `${currentPath}.${key}` : key)
      if (diff) return diff
    }
    return null
  }
  return { path: currentPath, baseline: a, current: b }
}

function formatDiffValue(value) {
  if (value === undefined) return '<absent>'
  const json = JSON.stringify(value)
  return json.length > 120 ? `${json.slice(0, 120)}…` : json
}

/**
 * Compare baseline vs current event-trees content and report per-event differences.
 * Returns the failing events as [{ name, detail }].
 */
function compareEventTrees(baselineTrees, currentTrees) {
  const baselineByName = new Map(baselineTrees.map((event) => [event.name, event]))
  const currentByName = new Map(currentTrees.map((event) => [event.name, event]))
  const failures = []

  for (const name of baselineByName.keys()) {
    if (!currentByName.has(name)) failures.push({ name, detail: 'event removed' })
  }
  for (const name of currentByName.keys()) {
    if (!baselineByName.has(name)) failures.push({ name, detail: 'event added' })
  }

  for (const [name, baselineEvent] of baselineByName) {
    const currentEvent = currentByName.get(name)
    if (!currentEvent) continue
    const diff = findFirstDifference(normalizeEvent(baselineEvent), normalizeEvent(currentEvent))
    if (diff) {
      failures.push({
        name,
        detail: `${diff.path}: ${formatDiffValue(diff.baseline)} → ${formatDiffValue(diff.current)}`,
      })
    }
  }

  return failures.sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * Validates the generated event-trees.json against a baseline and reports which
 * events changed meaningfully (structural comparison, see module doc).
 *
 * @param {Object} [options]
 * @param {string} [options.currentPath] - File to validate (default: the canonical output file).
 *                                         Used by --dry-run, which writes to a temp file.
 * @param {string} [options.baselinePath] - Snapshot file to compare against (default: git HEAD
 *                                          version of the canonical output file).
 */
function validateEventTreesChanges(options = {}) {
  const filePath = path.join(__dirname, '../../src/codex/data/event-trees.json')
  const relativePath = path.relative(process.cwd(), filePath)
  const currentPath = options.currentPath || filePath

  try {
    const currentContent = fs.readFileSync(currentPath, 'utf-8')

    // Resolve the baseline: an explicit snapshot file, or the committed version of the output
    let baselineContent
    if (options.baselinePath) {
      baselineContent = fs.readFileSync(options.baselinePath, 'utf-8')
      console.log(`\nValidating against baseline: ${options.baselinePath}`)
    } else {
      baselineContent = execSync(`git show HEAD:${relativePath}`, {
        encoding: 'utf-8',
        cwd: process.cwd(),
        maxBuffer: 64 * 1024 * 1024,
      })
    }

    if (baselineContent === currentContent) {
      console.log('No changes detected in event-trees.json')
      return
    }

    const failures = compareEventTrees(JSON.parse(baselineContent), JSON.parse(currentContent))

    if (failures.length > 0) {
      console.log(`❌ ${failures.length} events failing validation:`)
      failures.forEach(({ name, detail }) => {
        console.log(`  - ${name}`)
        console.log(`      ${detail}`)
      })
    } else {
      console.log('✅ No events failing validation')
    }
  } catch (error) {
    if (error.message.includes('not a git repository') || error.message.includes('No such file')) {
      return
    }
    throw error
  }
}

module.exports = { validateEventTreesChanges }
