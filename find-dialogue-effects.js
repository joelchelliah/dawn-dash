const fs = require('fs')
const path = require('path')

const filePath = path.join(__dirname, 'src/codex/data/event-trees.json')
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'))

const dialogueNodesWithEffects = []

function traverseNode(node, eventName = '', nodePath = []) {
  if (!node) return

  const currentPath = [...nodePath, node.id || 'root']

  if (node.type === 'combat' && node.effects && node.effects.length > 0) {
    dialogueNodesWithEffects.push({
      eventName,
      nodeId: node.id,
      text: node.text ? node.text.substring(0, 100) + '...' : '',
      effects: node.effects,
      path: currentPath.join(' > ')
    })
  }

  // Traverse children
  if (node.children) {
    node.children.forEach(child => traverseNode(child, eventName, currentPath))
  }

  // Traverse options
  if (node.options) {
    node.options.forEach(option => traverseNode(option, eventName, currentPath))
  }
}

// Traverse all events (data is an array)
data.forEach((event) => {
  if (event.rootNode) {
    traverseNode(event.rootNode, event.name)
  }
})

console.log(`Found ${dialogueNodesWithEffects.length} combat nodes with effects:\n`)
dialogueNodesWithEffects.forEach((item, index) => {
  console.log(`${index + 1}. Event: ${item.eventName}`)
  console.log(`   Node ID: ${item.nodeId}`)
  console.log(`   Text: ${item.text}`)
  console.log(`   Effects: ${JSON.stringify(item.effects, null, 2)}`)
  console.log(`   Path: ${item.path}`)
  console.log('')
})

console.log(`\nTotal: ${dialogueNodesWithEffects.length} combat nodes with effects`)
