/* eslint-disable */
const fs = require('fs')
const path = require('path')

const EVENT_TREES_FILE = path.join(__dirname, './event-trees.json')
const EVENT_NAME = process.argv[2] || 'Alchemist' // Pass event name as argument, default to Alchemist

/**
 * Draws an event tree in the terminal using ASCII art
 */
function drawEventTree() {
  console.log('Reading event trees...')
  const content = fs.readFileSync(EVENT_TREES_FILE, 'utf-8')
  const eventTrees = JSON.parse(content)

  // Find the event by name
  const event = eventTrees.find((e) => e.name === EVENT_NAME)

  if (!event) {
    console.error(`Event "${EVENT_NAME}" not found!`)
    process.exit(1)
  }

  console.log(`\n📊 Event: ${event.name} (Type ${event.type})`)
  console.log(`📝 Description: ${event.desc || 'N/A'}`)
  console.log(`🌳 Total nodes: ${countNodes(event.rootNode)}`)
  console.log('\n' + '='.repeat(80) + '\n')

  // Draw the tree starting from the root
  drawNode(event.rootNode, '', true, true)

  console.log('\n' + '='.repeat(80))
}

/**
 * Count total nodes in a tree
 */
function countNodes(node) {
  if (!node) return 0
  let count = 1
  if (node.children) {
    node.children.forEach((child) => {
      count += countNodes(child)
    })
  }
  return count
}

/**
 * Draw a single node and its children recursively
 */
function drawNode(node, prefix, isLast, isRoot) {
  if (!node) return

  // Connector line
  const connector = isRoot ? '' : isLast ? '└── ' : '├── '

  // Node label with type indicator
  const typeIcon = getTypeIcon(node.type)
  const label = formatNodeLabel(node)

  console.log(prefix + connector + typeIcon + ' ' + label)

  // Show effects if present
  if (node.effects && node.effects.length > 0) {
    const effectPrefix = prefix + (isRoot ? '' : isLast ? '    ' : '│   ')
    node.effects.forEach((effect) => {
      console.log(effectPrefix + '⚡ ' + effect)
    })
  }

  // Show requirements if present
  if (node.requirements && node.requirements.length > 0) {
    const reqPrefix = prefix + (isRoot ? '' : isLast ? '    ' : '│   ')
    node.requirements.forEach((req) => {
      console.log(reqPrefix + '🔒 ' + req)
    })
  }

  // Draw children
  if (node.children && node.children.length > 0) {
    const childPrefix = prefix + (isRoot ? '' : isLast ? '    ' : '│   ')

    node.children.forEach((child, index) => {
      const isLastChild = index === node.children.length - 1
      drawNode(child, childPrefix, isLastChild, false)
    })
  }
}

/**
 * Get an icon representing the node type
 */
function getTypeIcon(type) {
  switch (type) {
    case 'start':
      return '🟢'
    case 'dialogue':
      return '💬'
    case 'choice':
      return '🔀'
    case 'end':
      return '🔴'
    case 'combat':
      return '⚔️'
    default:
      return '❓'
  }
}

/**
 * Format the node label with text preview
 */
function formatNodeLabel(node) {
  const parts = []

  // Node ID
  parts.push(`[${node.id}]`)

  // Choice label if present
  if (node.choiceLabel) {
    parts.push(`Choice: "${truncate(node.choiceLabel, 40)}"`)
  }

  // Text preview
  if (node.text && node.text.trim()) {
    parts.push(`"${truncate(node.text, 50)}"`)
  } else if (!node.choiceLabel) {
    parts.push('(no text)')
  }

  // Type
  parts.push(`(${node.type})`)

  // Repeatable indicator
  if (node.repeatable) {
    parts.push('🔄')
  }

  return parts.join(' ')
}

/**
 * Truncate text to a maximum length
 */
function truncate(text, maxLength) {
  if (!text) return ''
  const cleaned = text.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim()
  if (cleaned.length <= maxLength) return cleaned
  return cleaned.substring(0, maxLength - 3) + '...'
}

// Run the script
try {
  drawEventTree()
} catch (error) {
  console.error('Error:', error.message)
  process.exit(1)
}
