const fs = require('fs')
const path = require('path')

const TREES_FILE = path.join(__dirname, '../src/codex/data/event-trees.json')

const data = JSON.parse(fs.readFileSync(TREES_FILE, 'utf-8'))

let count = 0
const issues = []

function checkNode(node, eventName, depth = 0) {
  if (!node) return

  if (node.repeatable && node.repeatFrom !== undefined) {
    count++
    issues.push({
      event: eventName,
      nodeId: node.id,
      type: node.type,
      text: node.text?.substring(0, 50) || node.choiceLabel?.substring(0, 50) || '(no text)',
      repeatFrom: node.repeatFrom,
    })
  }

  if (node.children) {
    node.children.forEach((child) => checkNode(child, eventName, depth + 1))
  }
}

data.forEach((tree) => {
  if (tree.rootNode) {
    checkNode(tree.rootNode, tree.name)
  }
})

if (count > 0) {
  console.log('❌ Found nodes with BOTH repeatable and repeatFrom:\n')
  issues.forEach((issue) => {
    console.log(`  Event: "${issue.event}"`)
    console.log(`  Node ID: ${issue.nodeId}`)
    console.log(`  Type: ${issue.type}`)
    console.log(`  Text/Choice: ${issue.text}`)
    console.log(`  repeatFrom: ${issue.repeatFrom}`)
    console.log()
  })
  console.log(`Total: ${count} nodes with both fields`)
} else {
  console.log('✅ No nodes found with both repeatable and repeatFrom!')
  console.log('   The fix is working correctly.')
}
