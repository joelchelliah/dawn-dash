# Secondary Hub Patterns via Post-Processing Pass

## Problem Statement

Some events (e.g., "The Boneyard") have **multiple distinct dialogue menu hub patterns** that could benefit from deduplication. Currently, we can only configure one hub pattern per event in `DIALOGUE_MENU_EVENTS`.

### Why Not Array Support During Tree Building?

Supporting multiple patterns during tree building (e.g., `'The Boneyard': [pattern1, pattern2]`) introduces:
- High complexity (7/10)
- Race conditions with hub detection timing
- Ambiguous hub context when nodes match multiple patterns
- Requires refactoring ~15 call sites
- Difficult to debug and maintain

See detailed analysis in commit history for full assessment of that approach.

---

## Proposed Solution: Post-Processing Pass

Apply secondary hub patterns **after the tree is fully built**, as a separate optimization pass.

### Key Insight

By waiting until the tree is complete and stable, we avoid:
- ✅ All race conditions (tree building is done)
- ✅ Timing issues (all nodes have stable IDs)
- ✅ Context ambiguity (can traverse tree as pure data structure)
- ✅ Interference with other optimization passes

---

## Architecture

### Current Pipeline (Simplified)

```
1. Build Tree (with primary hub detection)
   ↓
2. Post-Processing Pipeline:
   - Separate choices from effects
   - Deduplicate subtrees (2 passes)
   - Normalize refs to choice nodes
   - Promote shallow dialogue-menu hubs  ← Existing post-processing
   - Convert sibling/cousin refs
   - Check invalid refs
   ↓
3. Write output
```

### Proposed Addition

```
2. Post-Processing Pipeline:
   - ...
   - Promote shallow dialogue-menu hubs
   - Apply secondary hub patterns        ← NEW PASS (insert here)
   - Convert sibling/cousin refs
   - Check invalid refs
```

---

## Configuration

### Add New Config Object

```javascript
// New config section (separate from DIALOGUE_MENU_EVENTS)
const SECONDARY_HUB_PATTERNS = {
  'The Boneyard': {
    menuHubPattern: '"Second hub pattern text here',
    menuExitPatterns: ['Continue', 'Leave'],
    hubChoiceMatchThreshold: 80, // % of hub choices that must match
  },
  // Add other events with secondary patterns as needed
}
```

### Add Toggle Flag

```javascript
const OPTIMIZATION_PASS_CONFIG = {
  // ...existing flags
  APPLY_SECONDARY_HUB_PATTERNS_ENABLED: true,
}
```

---

## Implementation

### Core Algorithm

```javascript
function applySecondaryHubPatterns(eventTrees) {
  let totalRefsCreated = 0
  const eventsWithSecondaryRefs = []

  eventTrees.forEach((tree) => {
    const eventName = tree.name
    const secondaryConfig = SECONDARY_HUB_PATTERNS[eventName]

    // Skip events without secondary pattern config
    if (!secondaryConfig) return
    if (!tree.rootNode) return

    let refsForEvent = 0

    // Step 1: Build node map for easy lookup
    const nodesById = new Map()
    const collectNodes = (node) => {
      if (!node || node.id === undefined) return
      nodesById.set(node.id, node)
      if (node.children) {
        node.children.forEach(collectNodes)
      }
    }
    collectNodes(tree.rootNode)

    // Step 2: Find all nodes matching secondary hub pattern
    const secondaryHubs = []
    nodesById.forEach((node) => {
      if (
        typeof node.text === 'string' &&
        node.text.includes(secondaryConfig.menuHubPattern)
      ) {
        secondaryHubs.push(node)
      }
    })

    if (secondaryHubs.length === 0) {
      if (eventName === DEBUG_EVENT_NAME) {
        console.log(`  ⚠️  No secondary hubs found for "${eventName}"`)
      }
      return
    }

    // Step 3: Pick canonical secondary hub (shallowest with children)
    const hubsWithChildren = secondaryHubs.filter(
      (n) => n.ref === undefined && n.children && n.children.length > 0
    )

    if (hubsWithChildren.length === 0) {
      if (eventName === DEBUG_EVENT_NAME) {
        console.log(`  ⚠️  No valid secondary hub candidates for "${eventName}"`)
      }
      return
    }

    // Get depth for sorting
    const getDepth = (node) => {
      const queue = [{ node: tree.rootNode, depth: 0 }]
      while (queue.length > 0) {
        const { node: current, depth } = queue.shift()
        if (current.id === node.id) return depth
        if (current.children) {
          current.children.forEach((child) =>
            queue.push({ node: child, depth: depth + 1 })
          )
        }
      }
      return Infinity
    }

    hubsWithChildren.sort((a, b) => getDepth(a) - getDepth(b))
    const canonicalHub = hubsWithChildren[0]

    // Step 4: Build choice snapshot from canonical hub (exclude exit patterns)
    const hubChoiceLabels = new Set()
    if (canonicalHub.children) {
      canonicalHub.children.forEach((child) => {
        if (!child.choiceLabel) return

        // Exclude exit patterns from snapshot
        const isExitChoice = secondaryConfig.menuExitPatterns.some((pattern) =>
          child.choiceLabel.includes(pattern)
        )

        if (!isExitChoice) {
          hubChoiceLabels.add(child.choiceLabel)
        }
      })
    }

    if (hubChoiceLabels.size === 0) {
      if (eventName === DEBUG_EVENT_NAME) {
        console.log(`  ⚠️  No hub choices captured for "${eventName}"`)
      }
      return
    }

    // Step 5: Traverse tree and find nodes that match the snapshot
    nodesById.forEach((node) => {
      // Skip the canonical hub itself
      if (node.id === canonicalHub.id) return

      // Skip nodes that are already refs
      if (node.ref !== undefined) return

      // Skip nodes without children
      if (!node.children || node.children.length === 0) return

      // Extract choice labels from this node's children
      const nodeChoiceLabels = new Set()
      node.children.forEach((child) => {
        if (child.choiceLabel) {
          nodeChoiceLabels.add(child.choiceLabel)
        }
      })

      if (nodeChoiceLabels.size === 0) return

      // Calculate match percentage
      let matchCount = 0
      hubChoiceLabels.forEach((hubChoice) => {
        if (nodeChoiceLabels.has(hubChoice)) {
          matchCount++
        }
      })

      const matchPercentage = (matchCount / hubChoiceLabels.size) * 100

      // If match threshold met, convert to ref
      if (matchPercentage >= secondaryConfig.hubChoiceMatchThreshold) {
        node.ref = canonicalHub.id
        delete node.children
        refsForEvent++

        if (eventName === DEBUG_EVENT_NAME) {
          console.log(
            `  🔄 Created secondary ref: node ${node.id} -> hub ${canonicalHub.id} (${matchPercentage.toFixed(1)}% match)`
          )
        }
      }
    })

    if (refsForEvent > 0) {
      totalRefsCreated += refsForEvent
      eventsWithSecondaryRefs.push({ name: eventName, refs: refsForEvent })

      if (eventName === DEBUG_EVENT_NAME) {
        console.log(
          `  ✅ Applied secondary hub pattern for "${eventName}": created ${refsForEvent} refs to hub ${canonicalHub.id}`
        )
      }
    }
  })

  // Log summary
  console.log(`  Created ${totalRefsCreated} secondary hub refs`)
  if (CONFIG.VERBOSE_LOGGING && eventsWithSecondaryRefs.length > 0) {
    console.log(`\n  Events with secondary refs:`)
    eventsWithSecondaryRefs.forEach(({ name, refs }) => {
      console.log(`    - "${name}": ${refs} refs`)
    })
  }
}
```

### Integration into Pipeline

```javascript
// Around line 1885 in parse-event-trees.js

if (OPTIMIZATION_PASS_CONFIG.PROMOTE_SHALLOW_DIALOGUE_MENU_HUB_ENABLED) {
  console.log('\n🧭 Promoting shallow dialogue-menu hubs...')
  promoteShallowDialogueMenuHub(eventTrees)
  debugCheckEventPipelineState(eventTrees, 'after promoteShallowDialogueMenuHub')
}

// NEW PASS
if (OPTIMIZATION_PASS_CONFIG.APPLY_SECONDARY_HUB_PATTERNS_ENABLED) {
  console.log('\n🔄 Applying secondary hub patterns...')
  applySecondaryHubPatterns(eventTrees)
  debugCheckEventPipelineState(eventTrees, 'after applySecondaryHubPatterns')
}

if (OPTIMIZATION_PASS_CONFIG.CONVERT_SIBLING_AND_COUSIN_REFS_TO_REF_CHILDREN_ENABLED) {
  console.log('\n🔗 Converting sibling and SIMPLE cousin refs to refChildren...')
  // ...existing code
}
```

---

## Edge Cases Handled

### 1. Node Already Has Ref (From Primary Pattern)

```javascript
if (node.ref !== undefined) return // Skip
```

**Result**: Primary pattern takes precedence (applied first during building)

### 2. Secondary Hub Inside Primary Hub's Subtree

```
Primary Hub A
  ├─ Child 1
  ├─ Secondary Hub B
  │   ├─ Sub-child 1
  │   └─ Sub-child 2
  └─ Child 3 (matches Secondary Hub B)
```

**Result**: Allowed - nested hubs are valid. Child 3 gets ref to Secondary Hub B.

### 3. Multiple Nodes Match Secondary Pattern

```
- Node A at depth 5 (has children)
- Node B at depth 3 (has children)  ← Chosen as canonical
- Node C at depth 8 (is ref)
```

**Result**: Shallowest node with children becomes canonical hub (same logic as primary)

### 4. No Valid Secondary Hub Found

```javascript
if (hubsWithChildren.length === 0) {
  if (eventName === DEBUG_EVENT_NAME) {
    console.log(`  ⚠️  No valid secondary hub candidates`)
  }
  return
}
```

**Result**: Silent skip (warning only in debug mode)

---

## Complexity Analysis

### Implementation Complexity: **LOW (3/10)**

| Aspect | Rating | Notes |
|--------|--------|-------|
| Code Changes | Low | ~150 new lines, no modifications to existing code |
| Logic Complexity | Low | Simple tree traversal + matching logic |
| Race Conditions | None | Tree is stable before pass runs |
| Debug Difficulty | Low | Can toggle on/off, clear before/after states |
| Maintenance | Low | Isolated function, easy to understand |

### Comparison: Post-Processing vs. During Building

| Aspect | During Building | Post-Processing |
|--------|----------------|-----------------|
| Complexity | High (8/10) | Low (3/10) |
| Race Conditions | Multiple | None |
| Code Changes | ~15 call sites | ~150 new lines |
| Interference Risk | High | None |
| Debug Difficulty | High | Low |
| Performance | Optimal | Slightly slower (negligible) |

---

## Pros & Cons

### ✅ Pros

1. **No Interference**: Zero risk of breaking existing optimization passes
2. **Clean Separation**: Primary and secondary patterns don't interact
3. **Easy to Implement**: ~150 lines, straightforward logic
4. **Easy to Debug**: Toggle flag, clear logging, stable tree state
5. **Maintainable**: Future developers can understand it easily
6. **No Race Conditions**: Tree is fully built and stable
7. **Backward Compatible**: Only affects events in `SECONDARY_HUB_PATTERNS`

### ⚠️ Cons

1. **Two Config Objects**: Must maintain `DIALOGUE_MENU_EVENTS` and `SECONDARY_HUB_PATTERNS` separately
2. **No Pattern Priority**: Primary always runs first, can't make secondary "win"
3. **Slight Performance Cost**: Builds some subtrees that get replaced (negligible in practice)
4. **Potential Conflicts**: Need to skip nodes already processed by primary pattern

---

## Risk Assessment

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| Secondary refs conflict with primary | Medium | Low | Skip nodes with existing refs |
| Nested hub refs create cycles | Low | Very Low | Validate refs after pass |
| Performance impact | Low | Very Low | Post-processing is already fast |
| Config maintenance burden | Low | Medium | Document clearly, keep configs near each other |

**Overall Risk Level**: **LOW** ✅

---

## Verdict

### **RECOMMENDED FOR IMPLEMENTATION** ✅

**Complexity Rating**: 3/10 (Low)
**Estimated Implementation Time**: 2-3 hours
**Risk Level**: Low

### Why It's Worth It

1. ✅ Enables multi-pattern hub deduplication without complexity
2. ✅ Clean, isolated implementation that doesn't risk existing code
3. ✅ Easy to test, debug, and maintain
4. ✅ Can be toggled on/off for A/B testing
5. ✅ Future-proof: Easy to extend for tertiary patterns if needed

### When to Use

- ✅ Events with 2+ distinct dialogue menu patterns
- ✅ Secondary pattern appears less frequently than primary
- ✅ Want to avoid complex changes to tree-building logic

### Implementation Checklist

- [ ] Add `SECONDARY_HUB_PATTERNS` config object
- [ ] Add `APPLY_SECONDARY_HUB_PATTERNS_ENABLED` flag to `OPTIMIZATION_PASS_CONFIG`
- [ ] Implement `applySecondaryHubPatterns()` function
- [ ] Integrate into post-processing pipeline (after promote shallow hubs)
- [ ] Test with "The Boneyard" event
- [ ] Add debug logging with `DEBUG_EVENT_NAME`
- [ ] Document in CLAUDE.md

---

## Example Usage

### Config

```javascript
const SECONDARY_HUB_PATTERNS = {
  'The Boneyard': {
    menuHubPattern: '"I don\'t have an opinion on that',
    menuExitPatterns: ['Continue'],
    hubChoiceMatchThreshold: 60,
  },
}
```

### Expected Output

```
🔄 Applying secondary hub patterns...
  ✅ Applied secondary hub pattern for "The Boneyard": created 12 refs to hub 4567
  Created 12 secondary hub refs

  Events with secondary refs:
    - "The Boneyard": 12 refs
```

### Before/After

**Before** (primary pattern only):
```
The Boneyard: 150 nodes
```

**After** (primary + secondary patterns):
```
The Boneyard: 138 nodes (-8% reduction)
```

---

## Future Extensions

If this works well, could extend to support:

1. **Tertiary patterns**: Add `TERTIARY_HUB_PATTERNS` config
2. **Pattern priority**: Add `priority` field to override order
3. **Cross-event patterns**: Match patterns across multiple events
4. **Dynamic thresholds**: Calculate threshold based on tree depth/complexity

---

## Related Files

- `scripts/parse-event-trees.js` - Main implementation location
- Lines 1617-1699 - Existing `promoteShallowDialogueMenuHub()` (similar pattern)
- Lines 1881-1885 - Integration point for new pass
- Lines 54-113 - Existing `DIALOGUE_MENU_EVENTS` config (primary patterns)

---

## Author Notes

This approach was chosen after evaluating array support during tree building, which had:
- High complexity (7/10)
- Multiple race conditions
- Ambiguous hub context issues
- Required extensive refactoring (~15 call sites)

Post-processing avoids all these issues by operating on stable, fully-built trees.

**Date**: 2026-01-25
**Status**: Proposed (not yet implemented)
