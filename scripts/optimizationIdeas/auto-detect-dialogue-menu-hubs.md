# Auto-Detection of Dialogue Menu Hub Patterns via Post-Processing

## Executive Summary

**Current State**: We manually define dialogue menu hub patterns in `DIALOGUE_MENU_EVENTS` config (14 events configured). Each event can only have ONE hub pattern.

**Proposal**: Create a post-processing pass that **automatically detects** dialogue menu hub patterns across all events, eliminating the need for manual configuration while improving tree quality.

**Key Insights**:
- Now that we have 14 manually-configured patterns, we have a **perfect validation dataset** to test auto-detection accuracy!
- Auto-detection naturally finds **ALL hub patterns** in an event (primary, secondary, tertiary, etc.), solving the "secondary hub patterns" problem for free!
- Conservative overlap handling ensures we only process non-conflicting patterns, with future support for sophisticated conflict resolution.

---

## Problem Statement

### Current Manual Configuration Burden

We currently maintain 14 events in `DIALOGUE_MENU_EVENTS`:

| Event | Threshold | Original Purpose |
|-------|-----------|------------------|
| Rathael the Slain Death | immediate | **CRITICAL**: Avoid 9! = 362,880 node explosion |
| Frozen Heart | 30% | **CRITICAL**: Complex branching requires early detection |
| Rotting Residence | 80% | Visual improvement |
| The Ferryman | 60% | Visual improvement |
| The Priestess | 60% | Visual improvement |
| The Boneyard | 60% | Visual improvement |
| The Defiled Sanctum | 60% | Visual improvement |
| Dawnbringer Ystel | 100% | Visual improvement |
| Heroes' Rest Cemetery Start | 60% | Visual improvement |
| Historic Shard | 60% | Visual improvement |
| Isle of Talos | 60% | Visual improvement |
| Kaius Tagdahar Death | 50% | Visual improvement |
| Statue of Ilthar II Death | 60% | Visual improvement |
| Sunfall Meadows Start | 60% | Visual improvement |

### Pain Points

1. **Manual Discovery**: Must manually identify hub patterns by inspecting event trees
2. **Inconsistent Coverage**: Many events likely have undiscovered hub patterns
3. **Maintenance Burden**: Must update config when game content changes
4. **Visual vs. Critical**: Most entries are for visual improvement, not parsing necessity
5. **Trial and Error**: Finding the right threshold percentage requires experimentation
6. **One Pattern Per Event**: Current config only supports one hub pattern per event (see [secondary-hub-patterns-post-processing.md](./secondary-hub-patterns-post-processing.md))

### Why Now Is the Perfect Time

✅ We have **14 validated patterns** to test against
✅ Tree building is **stable and complete** when post-processing runs
✅ We can **toggle the pass on/off** to verify it doesn't break anything
✅ Auto-detection can **discover patterns we missed**
✅ Can **validate accuracy** by comparing with manual config

---

## Proposed Solution: Auto-Detection Post-Processing Pass

### Core Concept

**Automatically detect dialogue menu hub patterns** by analyzing tree structure:

1. **Identify hub candidates**: Nodes with 3+ choice children that appear multiple times
2. **Detect return patterns**: Find nodes whose children loop back to the hub
3. **Calculate match threshold**: Determine what % of hub choices constitute a "return"
4. **Create refs**: Replace redundant hub copies with refs to the shallowest hub

### Key Advantages Over Manual Config

| Aspect | Manual Config | Auto-Detection |
|--------|--------------|----------------|
| Coverage | 14 events | **All events** |
| Maintenance | Update config when content changes | **Zero maintenance** |
| Discovery | Manual inspection required | **Automatic discovery** |
| Accuracy | Depends on human judgment | Consistent algorithm |
| Threshold Selection | Trial and error | **Data-driven calculation** |
| Future-Proof | Breaks when game updates | **Adapts automatically** |

---

## Architecture

### Current Pipeline (Simplified)

```
1. Build Tree (with early hub detection via DIALOGUE_MENU_EVENTS)
   ↓
2. Post-Processing Pipeline:
   - Filter default nodes
   - Separate choices from effects
   - Apply event alterations
   - Deduplicate subtrees (2 passes)
   - Normalize refs to choice nodes
   - Promote shallow dialogue-menu hubs
   - Convert sibling/cousin refs
   - Check invalid refs
   ↓
3. Write output
```

### Proposed Addition

```
2. Post-Processing Pipeline:
   - ...
   - Deduplicate subtrees (2 passes)
   - Normalize refs to choice nodes
   - Promote shallow dialogue-menu hubs
   - AUTO-DETECT DIALOGUE MENU HUBS       ← NEW PASS (insert here)
   - Convert sibling/cousin refs
   - Check invalid refs
```

**Why This Position?**

- ✅ After deduplication (reduces false positives)
- ✅ After ref normalization (ensures clean ref targets)
- ✅ After promote shallow hubs (doesn't conflict with manual patterns)
- ✅ Before refChildren conversion (can benefit from new refs)

---

## Implementation Design

### Phase 1: Hub Candidate Detection

**Goal**: Find nodes that appear to be dialogue menu hubs.

**Heuristics**:

```javascript
function isHubCandidate(node, nodeMap) {
  // Must have children
  if (!node.children || node.children.length < 3) return false

  // Must not already be a ref
  if (node.ref !== undefined) return false

  // Must be a dialogue node with text
  if (node.type !== 'dialogue' || !node.text) return false

  // Must have mostly choice children (at least 70%)
  const choiceChildren = node.children.filter(c => c.choiceLabel)
  const choiceRatio = choiceChildren.length / node.children.length
  if (choiceRatio < 0.7) return false

  // Look for other nodes with the same text pattern (hub duplicates)
  const textSignature = node.text.substring(0, 100) // First 100 chars
  const duplicates = Array.from(nodeMap.values()).filter(n =>
    n.id !== node.id &&
    n.text &&
    n.text.substring(0, 100) === textSignature
  )

  // Must have at least 1 duplicate (hub appears multiple times)
  if (duplicates.length === 0) return false

  return true
}
```

**Expected Candidates**: 20-30 hub patterns across all events

---

### Phase 2: Return Pattern Detection

**Goal**: Identify which children lead back to the hub (vs. exit paths).

**Algorithm**:

```javascript
function analyzeHubReturnPatterns(hubNode, allHubCopies, nodeMap) {
  // Build set of all hub node IDs
  const hubNodeIds = new Set(allHubCopies.map(h => h.id))

  // For each child of the hub, traverse descendants to check if they lead back to hub
  const childReturnStatus = new Map() // childId -> boolean (returns to hub?)

  hubNode.children.forEach(child => {
    const returnsToHub = doesPathReturnToHub(child, hubNodeIds, nodeMap, new Set())
    childReturnStatus.set(child.id, returnsToHub)
  })

  return childReturnStatus
}

function doesPathReturnToHub(node, hubNodeIds, nodeMap, visited) {
  // Prevent infinite loops
  if (visited.has(node.id)) return false
  visited.add(node.id)

  // Check direct children
  if (node.children) {
    for (const child of node.children) {
      // If any child is a hub copy, this path returns to hub
      if (hubNodeIds.has(child.id)) return true

      // If child has a ref to a hub copy, this path returns to hub
      if (child.ref !== undefined && hubNodeIds.has(child.ref)) return true

      // Recursively check descendants (max depth 5 to avoid deep traversal)
      if (visited.size < 5) {
        const childReturns = doesPathReturnToHub(child, hubNodeIds, nodeMap, visited)
        if (childReturns) return true
      }
    }
  }

  return false
}
```

**Expected Result**: Classify each hub choice as "return" or "exit"

---

### Phase 3: Threshold Calculation

**Goal**: Automatically determine the optimal match threshold.

**Strategy**:

```javascript
function calculateOptimalThreshold(hubNode, childReturnStatus) {
  const totalChoices = hubNode.children.filter(c => c.choiceLabel).length
  const returnChoices = Array.from(childReturnStatus.values()).filter(Boolean).length
  const exitChoices = totalChoices - returnChoices

  // If most choices return (80%+), use high threshold (90%)
  // This means we expect nodes to have almost all hub choices to be considered a return
  if (returnChoices / totalChoices >= 0.8) {
    return 90
  }

  // If moderate return rate (50-80%), use medium threshold (60-70%)
  if (returnChoices / totalChoices >= 0.5) {
    return Math.round((returnChoices / totalChoices) * 100)
  }

  // If low return rate (<50%), use conservative threshold (50%)
  // This is more lenient because we still want to catch partial returns
  return 50
}
```

**Examples**:

| Hub Choices | Return Choices | Exit Choices | Calculated Threshold |
|-------------|----------------|--------------|---------------------|
| 5 choices | 5 return | 0 exit | 90% (expect almost all choices) |
| 5 choices | 4 return | 1 exit | 80% (expect 4/5 choices) |
| 5 choices | 3 return | 2 exit | 60% (expect 3/5 choices) |
| 5 choices | 2 return | 3 exit | 50% (conservative) |

---

### Phase 4: Hub Consolidation

**Goal**: Create refs from duplicate hub copies to the canonical (shallowest) hub.

**Algorithm**:

```javascript
function consolidateHubCopies(canonicalHub, duplicateHubs, threshold, nodeMap) {
  let refsCreated = 0

  // Build choice signature from canonical hub
  const hubChoiceLabels = new Set()
  canonicalHub.children.forEach(child => {
    if (child.choiceLabel) {
      hubChoiceLabels.add(child.choiceLabel)
    }
  })

  // For each duplicate hub, check if it should become a ref
  duplicateHubs.forEach(duplicateNode => {
    // Skip if already a ref
    if (duplicateNode.ref !== undefined) return

    // Skip if no children
    if (!duplicateNode.children) return

    // Calculate match percentage
    const duplicateChoiceLabels = new Set()
    duplicateNode.children.forEach(child => {
      if (child.choiceLabel) {
        duplicateChoiceLabels.add(child.choiceLabel)
      }
    })

    let matchCount = 0
    hubChoiceLabels.forEach(label => {
      if (duplicateChoiceLabels.has(label)) matchCount++
    })

    const matchPercentage = (matchCount / hubChoiceLabels.size) * 100

    // If match meets threshold, convert to ref
    if (matchPercentage >= threshold) {
      duplicateNode.ref = canonicalHub.id
      delete duplicateNode.children
      refsCreated++
    }
  })

  return refsCreated
}
```

---

### Complete Implementation

```javascript
function autoDetectDialogueMenuHubs(eventTrees) {
  console.log('\n🔍 Auto-detecting dialogue menu hub patterns...')

  let totalHubsDetected = 0
  let totalRefsCreated = 0
  const eventsWithAutoDetection = []

  eventTrees.forEach(tree => {
    const eventName = tree.name
    if (!tree.rootNode) return

    // Step 1: Build node map
    const nodesById = new Map()
    const collectNodes = (node) => {
      if (!node || node.id === undefined) return
      nodesById.set(node.id, node)
      if (node.children) {
        node.children.forEach(collectNodes)
      }
    }
    collectNodes(tree.rootNode)

    // Step 2: Group nodes by text signature (first 100 chars)
    const textSignatureGroups = new Map() // signature -> [nodes]
    nodesById.forEach(node => {
      if (!node.text || node.text.length < 20) return
      if (node.type !== 'dialogue') return
      if (!node.children || node.children.length < 3) return
      if (node.ref !== undefined) return

      const signature = node.text.substring(0, 100)
      if (!textSignatureGroups.has(signature)) {
        textSignatureGroups.set(signature, [])
      }
      textSignatureGroups.get(signature).push(node)
    })

    // Step 3: Find hub candidate groups (nodes appearing 2+ times)
    const hubCandidateGroups = Array.from(textSignatureGroups.entries())
      .filter(([sig, nodes]) => nodes.length >= 2)
      .map(([sig, nodes]) => nodes)

    if (hubCandidateGroups.length === 0) return

    // Step 4: For each hub candidate group, analyze and consolidate
    let refsForEvent = 0
    let hubsForEvent = 0

    hubCandidateGroups.forEach(hubGroup => {
      // Find shallowest node with children (canonical hub)
      const getDepth = (node) => {
        const queue = [{ node: tree.rootNode, depth: 0 }]
        while (queue.length > 0) {
          const { node: current, depth } = queue.shift()
          if (current.id === node.id) return depth
          if (current.children) {
            current.children.forEach(child =>
              queue.push({ node: child, depth: depth + 1 })
            )
          }
        }
        return Infinity
      }

      const nodesWithChildren = hubGroup.filter(n =>
        n.children && n.children.length > 0 && n.ref === undefined
      )

      if (nodesWithChildren.length === 0) return

      nodesWithChildren.sort((a, b) => getDepth(a) - getDepth(b))
      const canonicalHub = nodesWithChildren[0]
      const duplicates = hubGroup.filter(n => n.id !== canonicalHub.id)

      // Calculate threshold based on hub structure
      const choiceChildren = canonicalHub.children.filter(c => c.choiceLabel)
      if (choiceChildren.length === 0) return

      // Use a conservative default threshold
      const threshold = 60

      // Consolidate duplicates
      const refsCreated = consolidateHubCopies(
        canonicalHub,
        duplicates,
        threshold,
        nodesById
      )

      if (refsCreated > 0) {
        refsForEvent += refsCreated
        hubsForEvent++

        if (eventName === DEBUG_EVENT_NAME) {
          const preview = canonicalHub.text.substring(0, 50)
          console.log(
            `  🎯 Hub detected at node ${canonicalHub.id}: "${preview}..." (created ${refsCreated} refs)`
          )
        }
      }
    })

    if (refsForEvent > 0) {
      totalRefsCreated += refsForEvent
      totalHubsDetected += hubsForEvent
      eventsWithAutoDetection.push({
        name: eventName,
        hubs: hubsForEvent,
        refs: refsForEvent
      })
    }
  })

  console.log(`  Detected ${totalHubsDetected} dialogue menu hubs`)
  console.log(`  Created ${totalRefsCreated} refs`)

  if (eventsWithAutoDetection.length > 0) {
    console.log(`\n  Events with auto-detected hubs:`)
    eventsWithAutoDetection.forEach(({ name, hubs, refs }) => {
      console.log(`    - "${name}": ${hubs} hub(s), ${refs} ref(s)`)
    })
  }

  return { totalHubsDetected, totalRefsCreated, eventsWithAutoDetection }
}
```

---

## Validation Strategy

### Compare Auto-Detection vs. Manual Config

We can validate auto-detection accuracy by comparing against our 14 manually-configured patterns:

```javascript
function validateAutoDetection(eventTrees) {
  console.log('\n📊 Validating auto-detection against manual config...')

  const manualConfig = OPTIMIZATION_PASS_CONFIG.DIALOGUE_MENU_EVENTS
  const manualEvents = Object.keys(manualConfig)

  const results = {
    truePositives: [], // Auto-detected AND manually configured
    falseNegatives: [], // Manually configured but NOT auto-detected
    falsePositives: [], // Auto-detected but NOT manually configured (could be good!)
  }

  eventTrees.forEach(tree => {
    const isManuallyConfigured = manualEvents.includes(tree.name)
    const wasAutoDetected = /* check if auto-detection found hubs */

    if (isManuallyConfigured && wasAutoDetected) {
      results.truePositives.push(tree.name)
    } else if (isManuallyConfigured && !wasAutoDetected) {
      results.falseNegatives.push(tree.name)
    } else if (!isManuallyConfigured && wasAutoDetected) {
      results.falsePositives.push(tree.name)
    }
  })

  const precision = results.truePositives.length /
    (results.truePositives.length + results.falsePositives.length)
  const recall = results.truePositives.length /
    (results.truePositives.length + results.falseNegatives.length)

  console.log(`  ✅ True Positives: ${results.truePositives.length} events`)
  console.log(`  ❌ False Negatives: ${results.falseNegatives.length} events`)
  console.log(`  ⚠️  False Positives: ${results.falsePositives.length} events (new discoveries!)`)
  console.log(`  📈 Precision: ${(precision * 100).toFixed(1)}%`)
  console.log(`  📈 Recall: ${(recall * 100).toFixed(1)}%`)

  if (results.falseNegatives.length > 0) {
    console.log(`\n  Missed manual patterns (needs tuning):`)
    results.falseNegatives.forEach(name => {
      console.log(`    - "${name}"`)
    })
  }

  if (results.falsePositives.length > 0) {
    console.log(`\n  New patterns discovered (not in manual config):`)
    results.falsePositives.forEach(name => {
      console.log(`    - "${name}"`)
    })
  }
}
```

**Success Criteria**:

- ✅ **Precision > 80%**: Most auto-detected patterns are valid
- ✅ **Recall > 70%**: Catches most manually-configured patterns
- ✅ **New discoveries > 0**: Finds patterns we missed

---

## Complexity Analysis

### Implementation Complexity: **MEDIUM (5/10)**

| Aspect | Rating | Notes |
|--------|--------|-------|
| Code Changes | Medium | ~300-400 new lines |
| Logic Complexity | Medium | Tree traversal + pattern matching |
| Heuristic Tuning | Medium | May need to adjust detection thresholds |
| Race Conditions | None | Tree is stable before pass runs |
| Debug Difficulty | Medium | Need good logging to understand decisions |
| Maintenance | Low | Once tuned, should be stable |

### Why Medium Complexity?

**Simpler than it sounds**:
- ✅ Tree is fully built (no race conditions)
- ✅ Can leverage existing helper functions (getDepth, buildNodeMap)
- ✅ Clear validation dataset (14 manual patterns to test against)

**More complex than simple post-processing**:
- ⚠️ Need heuristics to distinguish hubs from normal dialogue
- ⚠️ Threshold calculation requires experimentation
- ⚠️ Must handle edge cases (nested hubs, partial matches)

---

## Pros & Cons

### ✅ Pros

1. **Zero Maintenance**: No need to manually configure new events
2. **Complete Coverage**: Automatically checks ALL events, not just 14
3. **Discovers Hidden Patterns**: May find hub patterns we missed
4. **Consistent Logic**: Same algorithm across all events
5. **Self-Validating**: Can compare against manual config to measure accuracy
6. **Future-Proof**: Adapts when game content changes
7. **No Breaking Changes**: Runs in post-processing, doesn't affect tree building
8. **Can Replace Manual Config**: Eventually deprecate `DIALOGUE_MENU_EVENTS` (except critical ones)

### ⚠️ Cons

1. **Heuristic Tuning Required**: Need to find right detection parameters
2. **False Positives Possible**: May incorrectly identify non-hubs as hubs
3. **False Negatives Possible**: May miss some valid hub patterns
4. **Performance Cost**: Additional tree traversal (but still fast)
5. **Complex Debugging**: Need to understand why certain patterns were/weren't detected
6. **May Conflict with Manual Patterns**: Need to handle overlap gracefully

---

## Edge Cases to Handle

### 1. Nested Hubs (Hub Inside Hub)

```
Primary Hub A
  ├─ Question 1 → returns to Hub A
  ├─ Question 2 → returns to Hub A
  ├─ Secondary Hub B
  │   ├─ Sub-question 1 → returns to Hub B
  │   └─ Sub-question 2 → returns to Hub B
  └─ Question 3 → returns to Hub A
```

**Solution**: Allow nested hubs. Inner hub is processed independently.

---

### 2. Partial Text Matches

Two nodes with similar but not identical text:

```
Hub Copy 1: "The merchant looks at you expectantly. What would you like?"
Hub Copy 2: "The merchant looks at you expectantly. What can I get you?"
```

**Solution**: Use fuzzy matching or longer text signatures (100+ chars).

---

### 3. Hub Already Processed by Manual Config

Event has both:
- Manual config in `DIALOGUE_MENU_EVENTS` (processed during tree building)
- Auto-detection finds the same pattern

**Solution**: Skip nodes that already have refs from manual processing.

---

### 4. Hub with Very Few Duplicates

A "hub" that only appears 2 times might not be a true dialogue menu:

```
Node A (depth 3): "What would you like to do?"
Node B (depth 8): "What would you like to do?" (different context)
```

**Solution**: Require minimum duplicate count (3+) or additional heuristics.

---

### 5. Ambiguous Thresholds

Same hub structure could be interpreted multiple ways:

```
Hub with 5 choices:
- 3 choices definitely return
- 1 choice maybe returns (indirect path)
- 1 choice exits

Threshold: 60%? 80%? 100%?
```

**Solution**: Use conservative defaults (60%) and validate against manual config.

---

## Multiple Hub Patterns Per Event (Secondary Hubs)

### Problem: Events Can Have Multiple Distinct Hub Patterns

The [secondary-hub-patterns-post-processing.md](./secondary-hub-patterns-post-processing.md) document addresses the case where a single event (e.g., "The Boneyard") has **multiple distinct dialogue menu hub patterns**. Currently, manual config only allows one pattern per event.

**Key Insight**: Auto-detection naturally finds ALL hub patterns in an event, not just one! This means we can solve the secondary hub pattern problem "for free" as part of auto-detection.

### Example: The Boneyard

```
The Boneyard event structure:
├─ Primary Hub: "A parasite, one of the worst..."
│   ├─ Question 1 → returns to Primary Hub
│   ├─ Question 2 → returns to Primary Hub
│   └─ Continue (exit)
│
└─ Secondary Hub: "I don't have an opinion on that"
    ├─ Sub-question 1 → returns to Secondary Hub
    ├─ Sub-question 2 → returns to Secondary Hub
    └─ Continue (exit)
```

**Current Manual Config**: Only primary hub configured
**Auto-Detection**: Would discover BOTH hubs automatically!

---

### Strategy: Conservative First, Sophisticated Later

#### Phase 1: Skip Overlapping Patterns (Conservative)

**Goal**: Only consolidate hub patterns that don't interfere with each other.

**Overlap Detection**:

```javascript
function detectOverlap(hub1, hub2, nodesById) {
  // Check if either hub is in the other's subtree
  const hub1Subtree = getAllDescendantIds(hub1, nodesById)
  const hub2Subtree = getAllDescendantIds(hub2, nodesById)

  // If hub2 is in hub1's subtree (or vice versa), they overlap
  if (hub1Subtree.has(hub2.id) || hub2Subtree.has(hub1.id)) {
    return true
  }

  // Check if any duplicates of hub1 are in hub2's subtree (or vice versa)
  // This catches more complex overlaps
  const hub1Duplicates = findDuplicatesByTextSignature(hub1, nodesById)
  const hub2Duplicates = findDuplicatesByTextSignature(hub2, nodesById)

  for (const dup1 of hub1Duplicates) {
    if (hub2Subtree.has(dup1.id)) return true
  }

  for (const dup2 of hub2Duplicates) {
    if (hub1Subtree.has(dup2.id)) return true
  }

  return false
}

function getAllDescendantIds(node, nodesById, visited = new Set()) {
  if (visited.has(node.id)) return visited
  visited.add(node.id)

  if (node.children) {
    node.children.forEach(child => {
      getAllDescendantIds(child, nodesById, visited)
    })
  }

  return visited
}
```

**Algorithm Enhancement**:

```javascript
function autoDetectDialogueMenuHubs(eventTrees) {
  // ... existing code to find hub candidate groups ...

  // NEW: For events with multiple hub patterns
  eventTrees.forEach(tree => {
    // ... existing code to group nodes by text signature ...

    const hubCandidateGroups = Array.from(textSignatureGroups.entries())
      .filter(([sig, nodes]) => nodes.length >= 2)
      .map(([sig, nodes]) => nodes)

    if (hubCandidateGroups.length === 0) return

    // NEW: Sort hub groups by potential impact (most duplicates first)
    hubCandidateGroups.sort((a, b) => b.length - a.length)

    // NEW: Track which nodes have been converted to refs
    const processedNodeIds = new Set()

    hubCandidateGroups.forEach(hubGroup => {
      // Find canonical hub (shallowest with children, not already processed)
      const nodesWithChildren = hubGroup.filter(n =>
        n.children &&
        n.children.length > 0 &&
        n.ref === undefined &&
        !processedNodeIds.has(n.id) // NEW: Skip if already processed
      )

      if (nodesWithChildren.length === 0) return

      nodesWithChildren.sort((a, b) => getDepth(a) - getDepth(b))
      const canonicalHub = nodesWithChildren[0]

      // NEW: Check for overlaps with previously processed hubs
      let overlapsWithProcessed = false
      const canonicalSubtree = getAllDescendantIds(canonicalHub, nodesById)

      for (const processedId of processedNodeIds) {
        const processedNode = nodesById.get(processedId)
        if (!processedNode) continue

        // If canonical hub is in a processed node's subtree, skip it
        const processedSubtree = getAllDescendantIds(processedNode, nodesById)
        if (processedSubtree.has(canonicalHub.id)) {
          overlapsWithProcessed = true
          break
        }

        // If a processed node is in canonical hub's subtree, skip it
        if (canonicalSubtree.has(processedId)) {
          overlapsWithProcessed = true
          break
        }
      }

      if (overlapsWithProcessed) {
        if (eventName === DEBUG_EVENT_NAME) {
          const preview = canonicalHub.text.substring(0, 50)
          console.log(
            `  ⚠️  Skipping overlapping hub at node ${canonicalHub.id}: "${preview}..."`
          )
        }
        return // Skip this hub pattern
      }

      // Consolidate duplicates (existing logic)
      const duplicates = hubGroup.filter(n =>
        n.id !== canonicalHub.id &&
        !processedNodeIds.has(n.id) // NEW: Skip already processed nodes
      )

      const refsCreated = consolidateHubCopies(
        canonicalHub,
        duplicates,
        threshold,
        nodesById
      )

      if (refsCreated > 0) {
        // NEW: Mark all affected nodes as processed
        processedNodeIds.add(canonicalHub.id)
        duplicates.forEach(dup => {
          if (dup.ref !== undefined) {
            processedNodeIds.add(dup.id)
          }
        })

        refsForEvent += refsCreated
        hubsForEvent++
      }
    })
  })
}
```

**Benefits**:
- ✅ Automatically handles multiple hub patterns per event
- ✅ Conservative: Only processes non-overlapping patterns
- ✅ Processes most impactful hubs first (most duplicates)
- ✅ Prevents conflicts between patterns
- ✅ No manual config needed for secondary patterns

---

#### Phase 2: Handle Overlapping Patterns (Future Enhancement)

**Goal**: When two hub patterns overlap, intelligently choose which one to keep.

**Overlap Scenarios**:

1. **Nested Hubs (Parent-Child)**:
   ```
   Primary Hub (depth 5)
     ├─ Choice 1
     ├─ Secondary Hub (depth 7)  ← Nested inside primary
     └─ Choice 3
   ```
   **Resolution**: Keep both (nested hubs are valid)

2. **Competing Hubs (Same Subtree)**:
   ```
   Two different hub patterns share the same duplicate locations:
   - Hub A: "What would you like?" (5 duplicates)
   - Hub B: "Choose an option:" (3 duplicates, some overlap with A)
   ```
   **Resolution**: Keep hub with more duplicates (A wins)

3. **Partial Overlap (Some Shared Refs)**:
   ```
   Hub A creates refs at nodes [10, 20, 30]
   Hub B would create refs at nodes [25, 30, 35]
   Node 30 would be affected by both
   ```
   **Resolution**: First pattern wins for shared nodes

**Resolution Strategies**:

```javascript
function resolveOverlappingHubs(hub1, hub2, nodesById) {
  // Strategy 1: Nested hubs are both valid
  const hub1Depth = getDepth(hub1)
  const hub2Depth = getDepth(hub2)
  const hub1Subtree = getAllDescendantIds(hub1, nodesById)
  const hub2Subtree = getAllDescendantIds(hub2, nodesById)

  if (hub1Subtree.has(hub2.id)) {
    // hub2 is nested inside hub1 - keep both
    return 'KEEP_BOTH'
  }

  if (hub2Subtree.has(hub1.id)) {
    // hub1 is nested inside hub2 - keep both
    return 'KEEP_BOTH'
  }

  // Strategy 2: Choose hub with more duplicates (more impact)
  const hub1Duplicates = findDuplicatesByTextSignature(hub1, nodesById)
  const hub2Duplicates = findDuplicatesByTextSignature(hub2, nodesById)

  if (hub1Duplicates.length > hub2Duplicates.length) {
    return 'KEEP_HUB1'
  } else if (hub2Duplicates.length > hub1Duplicates.length) {
    return 'KEEP_HUB2'
  }

  // Strategy 3: Choose shallower hub (prefer earlier in tree)
  if (hub1Depth < hub2Depth) {
    return 'KEEP_HUB1'
  } else {
    return 'KEEP_HUB2'
  }
}
```

**Priority Heuristics**:

| Criterion | Weight | Notes |
|-----------|--------|-------|
| Nested (parent-child) | Infinity | Always keep both |
| Number of duplicates | High | More impact = higher priority |
| Tree depth | Medium | Shallower = earlier in gameplay |
| Choice count | Low | More choices = more complex hub |

**Implementation**:

```javascript
function autoDetectDialogueMenuHubsWithOverlapResolution(eventTrees) {
  // ... existing code ...

  hubCandidateGroups.forEach((hubGroup, idx) => {
    const canonicalHub = findCanonicalHub(hubGroup)

    // Check overlaps with ALL previous hubs (not just processed ones)
    const conflictingHubs = []

    for (let i = 0; i < idx; i++) {
      const previousHub = findCanonicalHub(hubCandidateGroups[i])

      if (detectOverlap(canonicalHub, previousHub, nodesById)) {
        conflictingHubs.push(previousHub)
      }
    }

    if (conflictingHubs.length > 0) {
      // Resolve conflicts using priority heuristics
      let shouldProcess = true

      for (const conflictingHub of conflictingHubs) {
        const resolution = resolveOverlappingHubs(canonicalHub, conflictingHub, nodesById)

        if (resolution === 'KEEP_HUB2' || resolution === 'KEEP_BOTH') {
          // This hub wins or both can coexist
          continue
        } else {
          // Previous hub wins, skip this one
          shouldProcess = false
          break
        }
      }

      if (!shouldProcess) {
        if (eventName === DEBUG_EVENT_NAME) {
          console.log(`  ⚠️  Skipping hub (lost priority): node ${canonicalHub.id}`)
        }
        return
      }
    }

    // Process this hub (existing consolidation logic)
    const refsCreated = consolidateHubCopies(canonicalHub, duplicates, threshold, nodesById)
    // ... existing code ...
  })
}
```

---

### Comparison: Auto-Detection vs. Manual Secondary Patterns

| Aspect | Manual Secondary Config | Auto-Detection Multiple Hubs |
|--------|------------------------|------------------------------|
| Configuration | Separate `SECONDARY_HUB_PATTERNS` object | Zero config ✅ |
| Discovery | Manual inspection per event | Automatic ✅ |
| Number of patterns | Limited by config maintenance | Unlimited (all patterns found) ✅ |
| Overlap handling | Must manually ensure no conflicts | Automatic detection + resolution ✅ |
| Maintenance | Update config for each new event | Zero maintenance ✅ |
| Complexity | Low (simple config) | Medium (heuristic logic) |

**Verdict**: Auto-detection makes manual secondary pattern config **obsolete**!

---

### Expected Results for Multi-Hub Events

**Example Event: "The Boneyard"**

**Current Manual Config** (primary pattern only):
```
The Boneyard: 150 nodes
Primary hub: "A parasite, one of the worst..." → creates 35 refs
```

**Auto-Detection** (both patterns):
```
The Boneyard: 132 nodes (-12% reduction)
Primary hub: "A parasite, one of the worst..." → creates 35 refs
Secondary hub: "I don't have an opinion on that" → creates 18 refs
```

**Additional Impact**: ~12% more node reduction per multi-hub event

---

### Implementation Priority

**Phase 1 (Conservative Overlap Handling)**:
- ✅ Process hubs in order of impact (most duplicates first)
- ✅ Skip any hub that overlaps with previously processed hubs
- ✅ Simple, safe, covers 80% of cases
- ✅ **Estimated Time**: +2 hours (minor modification to base algorithm)

**Phase 2 (Sophisticated Overlap Resolution)**:
- ⏰ Implement resolution heuristics (nested, duplicate count, depth)
- ⏰ Handle partial overlaps (shared ref targets)
- ⏰ Add confidence scoring for resolution decisions
- ⏰ **Estimated Time**: +1 week (requires careful tuning)

**Recommendation**: Implement Phase 1 as part of initial auto-detection. Add Phase 2 only if validation shows many valuable patterns being skipped due to overlaps.

---

### Success Metrics for Multi-Hub Detection

**Coverage Metrics**:
- ✅ Events with 2+ distinct hubs detected: >5 events
- ✅ Secondary hubs that were skipped due to overlap: <20%
- ✅ False positive secondary hubs: <10%

**Impact Metrics**:
- ✅ Additional node reduction from secondary hubs: >500 nodes
- ✅ Events with improved visualization: >10 events

**Validation**:
- ✅ Compare against "The Boneyard" manual secondary pattern (if we add it to config)
- ✅ Manual inspection of detected secondary hubs for top 5 multi-hub events

---

### Configuration for Multi-Hub Detection

```javascript
const OPTIMIZATION_PASS_CONFIG = {
  // ...existing flags

  // Auto-detect multiple hub patterns per event
  AUTO_DETECT_MULTIPLE_HUBS_PER_EVENT_ENABLED: true,

  // How to handle overlapping patterns
  AUTO_DETECT_OVERLAP_STRATEGY: 'SKIP', // Options: 'SKIP', 'RESOLVE'

  // When using 'RESOLVE' strategy, priority criteria
  AUTO_DETECT_OVERLAP_RESOLUTION_PRIORITY: [
    'NESTED_HUBS',      // Always keep nested hubs
    'DUPLICATE_COUNT',  // More duplicates = higher priority
    'TREE_DEPTH',       // Shallower = higher priority
  ],

  // Maximum hub patterns per event (safety limit)
  AUTO_DETECT_MAX_HUBS_PER_EVENT: 5,
}
```

---

### Advantages Over Manual Secondary Pattern Config

**The `secondary-hub-patterns-post-processing.md` document proposed:**
- Manual config: `SECONDARY_HUB_PATTERNS` object
- Requires identifying secondary pattern text manually
- Requires configuring exit patterns manually
- Requires tuning threshold manually
- Only handles events explicitly configured

**Auto-detection approach:**
- ✅ **Zero config**: Finds all hub patterns automatically
- ✅ **No text patterns needed**: Uses structural analysis
- ✅ **No manual thresholds**: Calculated per hub
- ✅ **Handles ALL events**: Not just configured ones
- ✅ **Discovers unexpected patterns**: May find tertiary hubs, etc.

**Conclusion**: Auto-detection is **strictly superior** to manual secondary pattern config. The manual approach should only be considered as a fallback if auto-detection proves too unreliable.

---

## Risk Assessment

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| False positives break trees | High | Low | Validate against known-good manual config |
| Misses critical patterns | Medium | Medium | Compare recall against manual config |
| Performance impact | Low | Very Low | Post-processing is already fast |
| Conflicts with manual config | Medium | Low | Skip nodes already processed manually |
| Difficult to debug | Medium | Medium | Add comprehensive logging |
| Heuristic tuning takes time | Low | High | Expected - use validation to guide tuning |

**Overall Risk Level**: **MEDIUM** ⚠️

**Mitigation**: Run in **validation mode** first (don't modify trees, just report findings).

---

## Implementation Phases

### Phase 1: Validation Mode (Week 1)

**Goal**: Prove the concept without modifying trees.

1. Implement detection heuristics
2. Log all detected hub candidates
3. Compare against manual config
4. Measure precision/recall
5. Tune heuristics until precision > 80%

**Deliverable**: Report showing detection accuracy

---

### Phase 2: Safe Deployment (Week 2)

**Goal**: Apply auto-detection only to non-critical events.

1. Add `AUTO_DETECT_DIALOGUE_MENU_HUBS_ENABLED` flag
2. Add `AUTO_DETECT_BLACKLIST` for critical events (Rathael, Frozen Heart)
3. Create refs for detected hubs
4. Validate trees with `CHECK_INVALID_REFS_ENABLED`
5. Compare node counts before/after

**Deliverable**: Working implementation with safety guards

---

### Phase 3: Full Rollout (Week 3)

**Goal**: Replace most manual config with auto-detection.

1. Keep only **critical** events in manual config (Rathael, Frozen Heart)
2. Move visual-improvement events to auto-detection
3. Deprecate threshold configs for non-critical events
4. Document new system in CLAUDE.md

**Deliverable**: Simplified config with auto-detection as default

---

## Expected Impact

### Node Count Reduction

Based on manual config results, estimate:

| Scenario | Events Affected | Refs Created | Node Reduction |
|----------|-----------------|--------------|----------------|
| Manual config only (single hub per event) | 14 events | ~500 refs | ~800 nodes |
| Auto-detection (single hub per event) | 25+ events | ~1000+ refs | ~1500+ nodes |
| Auto-detection (multiple hubs per event) | 25+ events | ~1500+ refs | ~2200+ nodes |

**Improvement**:
- ~50% more events optimized (25+ vs 14)
- ~2-3x node reduction (2200+ vs 800)
- **Bonus**: Solves secondary hub pattern problem without additional config

---

### Maintenance Reduction

| Task | Manual Config | Auto-Detection |
|------|--------------|----------------|
| Add new event pattern | 15-30 min | 0 min ✅ |
| Update threshold | 10-20 min | 0 min ✅ |
| Discover patterns | Manual inspection | Automatic ✅ |
| Validate patterns | Trial and error | Algorithmic ✅ |

**Time Saved**: ~2-3 hours per major game update

---

## Config Changes

### Keep Critical Manual Configs

```javascript
// Only keep events that MUST be processed during tree building
const DIALOGUE_MENU_EVENTS = {
  'Rathael the Slain Death': {
    menuHubPattern: 'A chance to tangle with one of these',
    menuExitPatterns: ['Fight: Confront the Seraph'],
    // No threshold = immediate ref creation (prevents node explosion)
  },
  'Frozen Heart': {
    menuHubPattern: 'A rhythmic pulse fills the cave',
    menuExitPatterns: ['Take the left tunnel', 'Take the right tunnel'],
    hubChoiceMatchThreshold: 30,
  },
}
```

**Rationale**: These 2 events hit node limits without early detection.

---

### Add Auto-Detection Config

```javascript
const OPTIMIZATION_PASS_CONFIG = {
  // ...existing flags

  // Auto-detect dialogue menu hubs in post-processing
  AUTO_DETECT_DIALOGUE_MENU_HUBS_ENABLED: true,

  // Minimum duplicate count to consider a hub candidate
  AUTO_DETECT_MIN_DUPLICATES: 2,

  // Minimum choice count for hub candidates
  AUTO_DETECT_MIN_CHOICES: 3,

  // Default threshold for match percentage
  AUTO_DETECT_DEFAULT_THRESHOLD: 60,

  // Skip auto-detection for these events (already handled during building)
  AUTO_DETECT_BLACKLIST: [
    'Rathael the Slain Death',
    'Frozen Heart',
  ],
}
```

---

## Success Metrics

### Validation Metrics (Phase 1)

- ✅ **Precision > 80%**: Auto-detection doesn't create false positives
- ✅ **Recall > 70%**: Auto-detection catches most manual patterns
- ✅ **New discoveries > 5**: Finds patterns we missed

### Deployment Metrics (Phase 2)

- ✅ **Zero invalid refs**: `CHECK_INVALID_REFS` passes
- ✅ **Node count reduction > 1000**: Measurable improvement
- ✅ **No parsing failures**: All events parse successfully

### Rollout Metrics (Phase 3)

- ✅ **Manual config reduced to 2-3 events**: Only critical events remain
- ✅ **Coverage > 25 events**: More events optimized than manual config
- ✅ **Zero maintenance hours**: No config updates needed for new content

---

## Open Questions

### 1. Text Signature Length

**Question**: How many characters should we use for text signature matching?

**Options**:
- 50 chars: Fast but may miss variations
- 100 chars: Balanced (recommended)
- 200 chars: Accurate but may be too strict

**Decision**: Start with 100, tune based on validation results.

---

### 2. Threshold Calculation Strategy

**Question**: Should we calculate thresholds dynamically or use a fixed default?

**Options**:
- **Fixed (60%)**: Simple, predictable
- **Dynamic**: Adapts to each hub's structure (complex)
- **Hybrid**: Fixed default with overrides for outliers

**Decision**: Start with fixed 60%, add dynamic calculation in Phase 2 if needed.

---

### 3. Handling Ambiguous Cases

**Question**: What if a node looks like a hub but isn't actually a dialogue menu?

**Example**: A combat node with multiple attack choices that happens to repeat.

**Mitigation**:
- ✅ Require `type === 'dialogue'` (combat nodes excluded)
- ✅ Require text content (pure choice nodes excluded)
- ✅ Validate against manual config (catch false positives early)

---

### 4. Integration with Existing Manual Config

**Question**: Should auto-detection run in addition to manual config, or replace it?

**Recommendation**: **Both modes**:
- **Phase 1-2**: Run both (auto-detection + manual config)
- **Phase 3**: Deprecate manual config except for critical events

---

## Alternative Approaches Considered

### Alternative 1: Enhance Manual Config with Auto-Suggestions

**Idea**: Auto-detection runs and suggests patterns, human approves/rejects.

**Pros**:
- ✅ Human validation before applying
- ✅ Builds trust in algorithm

**Cons**:
- ❌ Still requires manual intervention
- ❌ Doesn't solve maintenance burden

**Verdict**: Not recommended. Defeats the purpose of automation.

---

### Alternative 2: Machine Learning Classifier

**Idea**: Train ML model on 14 manual patterns to classify hubs.

**Pros**:
- ✅ Could learn complex patterns
- ✅ Might handle edge cases better

**Cons**:
- ❌ Overkill for this problem (14 samples is tiny)
- ❌ Adds external dependencies
- ❌ Much harder to debug

**Verdict**: Not recommended. Heuristic approach is sufficient.

---

### Alternative 3: Pattern Mining (Frequent Subgraph)

**Idea**: Use graph mining to find frequently repeated subgraphs.

**Pros**:
- ✅ Mathematically rigorous
- ✅ Could find other optimization opportunities

**Cons**:
- ❌ High implementation complexity
- ❌ Computationally expensive
- ❌ May find patterns that aren't hub menus

**Verdict**: Interesting for future research, but overkill for now.

---

## Future Extensions

If auto-detection works well, could extend to:

1. **Sophisticated overlap resolution**: Implement Phase 2 of multi-hub detection (see "Multiple Hub Patterns Per Event" section)
2. **Auto-detect exit patterns**: Identify which choices lead to exits (vs. returns)
3. **Auto-tune thresholds**: Learn optimal thresholds from tree structure
4. **Pattern explanation**: Generate human-readable explanations of detected patterns
5. **Cross-event patterns**: Find common hub patterns across multiple events
6. **Confidence scores**: Rank detected hubs by confidence level
7. **Interactive mode**: Show detected patterns in UI for manual review

---

## Related Files

**Implementation**:
- `scripts/parse/parse-event-trees.js` - Main implementation location (lines ~1660)
- `scripts/parse/configs.js` - Config location (add AUTO_DETECT flags)

**Existing Patterns**:
- Lines 30-104 in configs.js - Current `DIALOGUE_MENU_EVENTS` (14 patterns)

**Helper Functions** (can reuse):
- `buildNodeMapForTree()` - lines 1226-1237
- `debugCheckEventPipelineState()` - lines 1323-1345
- `promoteShallowDialogueMenuHub()` - lines 1423-1506 (similar structure)

---

## Verdict

### **RECOMMENDED FOR PHASED IMPLEMENTATION** ✅

**Complexity Rating**: 5/10 (Medium)
**Estimated Time**: 2-3 weeks (3 phases)
**Risk Level**: Medium (mitigated by validation phase)
**Expected Impact**: High (50% more events optimized, zero maintenance)

### Why It's Worth It

1. ✅ **Validation Dataset Available**: 14 manual patterns to test against
2. ✅ **High Impact**: Eliminates ongoing maintenance burden
3. ✅ **Discovers New Patterns**: May find 10+ events we missed
4. ✅ **Multiple Hubs Per Event**: Automatically detects secondary/tertiary patterns (solves secondary-hub-patterns problem!)
5. ✅ **Future-Proof**: Adapts to new content automatically
6. ✅ **Low Risk**: Can validate before deploying
7. ✅ **Complements Existing System**: Works alongside critical manual configs

### When NOT to Use Auto-Detection

- ❌ **Critical events** that hit node limits (keep manual config)
- ❌ **Events with complex custom logic** (use event-alterations.js)
- ❌ **Events with unusual hub patterns** (manual config handles edge cases)

### Implementation Checklist

#### Phase 1: Validation (Week 1)
- [ ] Implement `autoDetectDialogueMenuHubs()` in validation mode
- [ ] Add detection heuristics (text signature, choice count, duplicates)
- [ ] Implement `validateAutoDetection()` comparison function
- [ ] Run validation against 14 manual patterns
- [ ] Tune heuristics to achieve precision > 80%, recall > 70%
- [ ] Document findings in validation report

#### Phase 2: Safe Deployment (Week 2)
- [ ] Add `AUTO_DETECT_*` flags to `OPTIMIZATION_PASS_CONFIG`
- [ ] Add blacklist for critical events (Rathael, Frozen Heart)
- [ ] Integrate into post-processing pipeline (after promote shallow hubs)
- [ ] Create refs for detected hubs
- [ ] Validate with `CHECK_INVALID_REFS`
- [ ] Compare node counts before/after
- [ ] Debug any issues with `DEBUG_EVENT_NAME`

#### Phase 3: Full Rollout (Week 3)
- [ ] Reduce manual config to 2-3 critical events only
- [ ] Move visual-improvement events to auto-detection
- [ ] Add comprehensive logging
- [ ] Update CLAUDE.md documentation
- [ ] Create migration guide for future developers

---

## Example Output

### Validation Mode Output

```
🔍 Auto-detecting dialogue menu hub patterns (validation mode)...
  Detected 23 dialogue menu hubs across 18 events

📊 Validating auto-detection against manual config...
  ✅ True Positives: 12 events (Rotting Residence, The Ferryman, The Priestess, ...)
  ❌ False Negatives: 2 events (Rathael the Slain Death, Frozen Heart)
  ⚠️  False Positives: 6 events (Ancient Battlefield, Temple Offering, ...)
  📈 Precision: 66.7% (12/18)
  📈 Recall: 85.7% (12/14)

  Missed manual patterns (needs tuning):
    - "Rathael the Slain Death" (9 choices, immediate mode)
    - "Frozen Heart" (complex branching, threshold 30%)

  New patterns discovered (not in manual config):
    - "Ancient Battlefield" (detected hub at node 145)
    - "Temple Offering" (detected hub at node 78)
    - "Merchant's Rest" (detected hub at node 203)
    - "Shadow Archives" (detected hub at node 54)
    - "Lost Catacombs" (detected hub at node 112)
    - "Windswept Ruins" (detected hub at node 89)
```

---

### Deployment Mode Output

```
🔍 Auto-detecting dialogue menu hub patterns...
  Detected 21 dialogue menu hubs
  Created 847 refs

  Events with auto-detected hubs:
    - "Rotting Residence": 1 hub(s), 45 ref(s)
    - "The Ferryman": 1 hub(s), 38 ref(s)
    - "The Priestess": 1 hub(s), 52 ref(s)
    - "Ancient Battlefield": 1 hub(s), 28 ref(s)
    - "Temple Offering": 1 hub(s), 67 ref(s)
    - "Merchant's Rest": 1 hub(s), 34 ref(s)
    - ... (15 more events)

  Final node count: 8,453 (was 9,300) - 9.1% reduction
```

---

## Author Notes

**Why This Approach?**

After maintaining 14 manual patterns and realizing most are for visual improvement (not critical parsing), it became clear we need automation. The existing manual patterns provide a perfect validation dataset to test auto-detection accuracy.

**Key Insights**:

1. **Critical vs. Visual**: The distinction between "critical for parsing" (Rathael, Frozen Heart) vs. "nice for visualization" (the other 12) suggests we should automate the visual improvements while keeping critical patterns manual for safety.

2. **Multiple Hubs Per Event**: Auto-detection naturally finds ALL hub patterns in an event, solving the secondary hub patterns problem (see [secondary-hub-patterns-post-processing.md](./secondary-hub-patterns-post-processing.md)) without requiring separate config or implementation.

3. **Conservative Overlap Handling**: By processing hubs in order of impact (most duplicates first) and skipping overlapping patterns, we get 80% of the benefit with 20% of the complexity. Sophisticated overlap resolution can be added later if needed.

**Validation-First Strategy**: By implementing validation mode first, we can prove the concept works before modifying any trees, reducing risk significantly.

**Supersedes**: This approach makes the manual secondary pattern config proposed in `secondary-hub-patterns-post-processing.md` unnecessary. Auto-detection is strictly superior.

**Date**: 2026-01-26
**Status**: Proposed (detailed design ready for implementation)
**Next Steps**: Implement Phase 1 (validation mode) and measure results
