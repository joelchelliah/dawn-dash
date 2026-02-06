# Hub Pattern Optimization: Rollout Plan

## Current Status

**Implementation Complete**: BFS-based choice subset matching for dialogue menu hubs

**What We Built** (vs. original plan):
- ✅ Choice-based detection (not text signature matching)
- ✅ BFS traversal with depth tracking (not recursive path traversal)
- ✅ "Same or -1 choice" heuristic (no threshold calculation needed)
- ✅ Whitelist-based rollout (conservative, validated approach)
- ✅ 2-phase system: detect all → optimize whitelist only

**Why This Approach is Better**:
- Choice matching is semantic and robust (captures the actual hub pattern)
- No fragile text signatures or complex threshold math
- BFS is cleaner and naturally tracks depth
- Simpler implementation (~300 lines vs. planned ~400)

**Current Whitelist** (8 events):
- A Familiar Face
- A Strange Painting
- Abandoned Backpack
- Axe in the Stone
- Battleseer Hildune Death
- Brightcandle Consul
- Dawnbringer Ystel
- Kaius Tagdahar Death

---

## Phase 1: Expand Whitelist (Current Phase)

**Goal**: Validate the approach works correctly for more events before full rollout.

**Strategy**:
1. Run parser and check discovery log for hub candidates
2. Manually inspect promising candidates in the visualizer
3. Add validated events to whitelist incrementally
4. Monitor node count reductions and tree quality

**Success Criteria**:
- ✅ No invalid refs created
- ✅ Tree visualization quality improves
- ✅ Node counts decrease appropriately
- ✅ No breaking changes to event gameplay flow

**Validation Process**:
```bash
# Run parser to see candidates
npm run parse

# Check output for discovered hub patterns:
# "📋 Discovered N hub candidate(s) in M non-whitelisted event(s)"

# For interesting candidates:
# 1. Note the event name and node ID
# 2. Open visualizer and inspect the event
# 3. Verify hub pattern is correct (dialogue menu with returns)
# 4. Add to whitelist if valid
```

**Whitelist Expansion Strategy**:
- Start with candidates that have:
  - High duplicate count (10+ matching nodes)
  - Clear dialogue menu structure
  - Simple choice sets (3-5 choices)
- Avoid initially:
  - Complex branching events
  - Events with combat mixed in
  - Events already in DIALOGUE_MENU_EVENTS (let manual config handle them)

**Timeline**: 1-2 weeks of incremental additions

---

## Phase 2: Full Rollout

**Goal**: Enable hub pattern optimization for ALL events automatically.

**Prerequisites**:
- ✅ Whitelist includes 20+ events successfully
- ✅ No regressions found in expanded whitelist
- ✅ Parse validation shows consistent improvements
- ✅ Manual inspection of sample events confirms quality

**Implementation**:
```javascript
// In configs.js, change from whitelist to blacklist:

// Remove this:
POST_PROCESSING_HUB_PATTERN_OPTIMIZATION_WHITELIST: [
  // long list...
],

// Add this:
POST_PROCESSING_HUB_PATTERN_OPTIMIZATION_BLACKLIST: [
  // Only events that should NOT use hub optimization
  // (e.g., events with unusual patterns that break the heuristic)
],
```

**Testing Strategy**:
1. Run parser with full rollout
2. Use parse validation to compare against committed trees:
   ```bash
   npm run parse
   # Check for events with significant node count changes
   ```
3. Manually inspect events with large changes:
   - Node count decreased significantly (>10%): verify optimization is correct
   - Node count increased: investigate why (might need blacklist)
   - Node count unchanged: expected for non-hub events
4. Run full visualization suite to check for visual regressions

**Rollback Plan**:
- If issues found, add problematic events to blacklist
- Keep optimization enabled, just skip problem cases
- Investigate root cause and fix heuristic if needed

**Success Metrics**:
- ✅ Total node count across all events decreases by 1000-2000 nodes
- ✅ No invalid refs (CHECK_INVALID_REFS passes)
- ✅ Parse validation shows improvements, not regressions
- ✅ <5 events need blacklisting

**Timeline**: 1 week (testing + validation)

---

## Phase 3: Optimization Pass Consolidation

**Goal**: Simplify/remove existing optimizations that overlap with hub pattern optimization.

### Candidate Optimizations for Review

#### 1. DIALOGUE_MENU_EVENTS (Manual Config)

**Current State**: 20 events manually configured with hub patterns

**Overlap**: Hub pattern optimization can detect most of these automatically

**Action Plan**:
- [ ] Compare manual config results vs. auto-detection for each event
- [ ] Identify events where auto-detection produces identical or better results
- [ ] Move non-critical events from manual config to auto-detection
- [ ] Keep only CRITICAL events in manual config:
  - Events that hit node budget limits without early detection
  - Events with unusual patterns that auto-detection misses
  - Example: "Rathael the Slain Death" (9! = 362,880 ordering explosion)

**Expected Outcome**:
- Reduce manual config from 20 events → 2-3 critical events
- Zero maintenance for visual-improvement events
- Manual config becomes "emergency override" only

**Validation**:
```bash
# For each event in DIALOGUE_MENU_EVENTS:
# 1. Temporarily remove from manual config
# 2. Add to auto-detection whitelist
# 3. Run parser and compare node counts
# 4. If equivalent: keep in auto-detection
# 5. If worse: return to manual config
```

---

#### 2. PROMOTE_SHALLOW_DIALOGUE_MENU_HUB

**Current State**: Post-processing pass to promote shallowest hub copy for threshold-based events

**Overlap**: Hub pattern optimization already prefers shallowest hub (BFS order + depth sorting)

**Action Plan**:
- [ ] Review events using this pass
- [ ] Check if they're also in DIALOGUE_MENU_EVENTS
- [ ] Verify hub pattern optimization handles them correctly
- [ ] If overlap confirmed, disable this pass for auto-detected events

**Expected Outcome**:
- Simplify pipeline by removing redundant pass
- OR: Keep pass but skip events handled by hub optimization

**Implementation**:
```javascript
// Option 1: Skip auto-detected events in promote pass
function promoteShallowDialogueMenuHub(eventTrees) {
  eventTrees.forEach(tree => {
    const eventName = tree.name

    // Skip if hub pattern optimization handles this event
    if (wasHandledByHubOptimization(tree)) {
      return
    }

    // ... existing logic
  })
}

// Option 2: Remove pass entirely if redundant
// Delete PROMOTE_SHALLOW_DIALOGUE_MENU_HUB_ENABLED flag
```

---

#### 3. DEDUPLICATE_SUBTREES (Structural Deduplication)

**Current State**: 2-iteration breadth-first structural deduplication

**Overlap**: May duplicate work with hub pattern optimization on dialogue nodes

**Action Plan**:
- [ ] Add skip logic to structural dedup: skip dialogue nodes with 3+ choices
- [ ] Let hub optimization handle dialogue menus (semantic)
- [ ] Let structural dedup handle everything else (structural)

**Expected Outcome**:
- Clear division of labor:
  - Hub optimization: Dialogue menus (semantic, choice-based)
  - Structural dedup: Combat, effects, simple dialogues (structural, exact matching)
- Better performance (fewer nodes to process in structural dedup)
- Better accuracy (each pass focuses on what it does best)

**Implementation**:
```javascript
// In deduplicateEventTree():
for (const node of allNodes) {
  if (!node.children || node.children.length === 0) continue
  if (node.ref !== undefined) continue

  // NEW: Skip dialogue nodes with multiple choices - let hub detection handle these
  if (OPTIMIZATION_PASS_CONFIG.POST_PROCESSING_HUB_PATTERN_OPTIMIZATION_ENABLED) {
    const MIN_CHOICES = OPTIMIZATION_PASS_CONFIG.POST_PROCESSING_HUB_PATTERN_OPTIMIZATION_MIN_CHOICES || 3
    if (node.type === 'dialogue' && node.children) {
      const choiceCount = node.children.filter(c => c.choiceLabel).length
      if (choiceCount >= MIN_CHOICES) {
        continue // Skip - hub detection handles this
      }
    }
  }

  // ... rest of structural dedup logic
}
```

---

#### 4. PATH_CONVERGENCE (Early Dedup During Building)

**Current State**: Whitelist-based path convergence detection during tree building

**Overlap**: Detects when different paths reach the same node state (text + choices)

**Action Plan**:
- [ ] Review PATH_CONVERGENCE config (currently only "Frozen Heart")
- [ ] Check if hub pattern optimization makes this unnecessary
- [ ] Keep for critical events (node budget prevention)
- [ ] Consider removing for non-critical events

**Expected Outcome**:
- Keep as-is (different purpose: early dedup vs. post-processing hub detection)
- PATH_CONVERGENCE prevents node explosion during building
- Hub optimization cleans up remaining patterns after building

**Decision**: NO CHANGE (complementary, not overlapping)

---

### Consolidation Priority

**High Priority** (Phase 3A - weeks 1-2):
1. ✅ DIALOGUE_MENU_EVENTS reduction (biggest maintenance win)
2. ✅ DEDUPLICATE_SUBTREES division of labor (clear improvement)

**Medium Priority** (Phase 3B - week 3):
3. ⏰ PROMOTE_SHALLOW_DIALOGUE_MENU_HUB review (may be redundant)

**Low Priority** (Future):
4. ⏰ PATH_CONVERGENCE review (works fine, low priority)

---

## Configuration Changes Timeline

### Current (Phase 1):
```javascript
POST_PROCESSING_HUB_PATTERN_OPTIMIZATION_ENABLED: true,
POST_PROCESSING_HUB_PATTERN_OPTIMIZATION_MIN_CHOICES: 3,
POST_PROCESSING_HUB_PATTERN_OPTIMIZATION_MIN_TEXT_LENGTH: 20,
POST_PROCESSING_HUB_PATTERN_OPTIMIZATION_WHITELIST: [
  // 8 events (expanding)
],

DIALOGUE_MENU_EVENTS: {
  // 20 events (manual config)
},
```

### After Phase 2 (Full Rollout):
```javascript
POST_PROCESSING_HUB_PATTERN_OPTIMIZATION_ENABLED: true,
POST_PROCESSING_HUB_PATTERN_OPTIMIZATION_MIN_CHOICES: 3,
POST_PROCESSING_HUB_PATTERN_OPTIMIZATION_MIN_TEXT_LENGTH: 20,
POST_PROCESSING_HUB_PATTERN_OPTIMIZATION_BLACKLIST: [
  // 0-5 events (edge cases only)
],

DIALOGUE_MENU_EVENTS: {
  // 20 events (manual config - to be reduced in Phase 3)
},
```

### After Phase 3 (Consolidation):
```javascript
POST_PROCESSING_HUB_PATTERN_OPTIMIZATION_ENABLED: true,
POST_PROCESSING_HUB_PATTERN_OPTIMIZATION_MIN_CHOICES: 3,
POST_PROCESSING_HUB_PATTERN_OPTIMIZATION_MIN_TEXT_LENGTH: 20,
POST_PROCESSING_HUB_PATTERN_OPTIMIZATION_BLACKLIST: [
  // 0-5 events (edge cases only)
],

DIALOGUE_MENU_EVENTS: {
  // 2-3 CRITICAL events only (node budget prevention)
  'Rathael the Slain Death': { /* ... */ },
  'Frozen Heart': { /* ... */ },
},

DEDUPLICATE_SUBTREES_SKIP_DIALOGUE_HUBS: true, // NEW: division of labor

PROMOTE_SHALLOW_DIALOGUE_MENU_HUB_ENABLED: false, // Potentially deprecated
```

---

## Success Metrics

### Phase 1 (Whitelist Expansion):
- ✅ Whitelist grows to 20+ events
- ✅ No regressions in tree quality
- ✅ Node count reductions observed

### Phase 2 (Full Rollout):
- ✅ Total node reduction: 1000-2000 nodes across all events
- ✅ Blacklist remains small (<5 events)
- ✅ Parse validation passes
- ✅ No invalid refs

### Phase 3 (Consolidation):
- ✅ DIALOGUE_MENU_EVENTS reduced from 20 → 2-3 events
- ✅ DEDUPLICATE_SUBTREES division of labor implemented
- ✅ Pipeline execution time reduced by 10-20%
- ✅ Code complexity reduced (fewer passes/configs)

---

## Risk Assessment

| Phase | Risk Level | Key Risks | Mitigation |
|-------|-----------|-----------|------------|
| Phase 1 | LOW ✅ | False positives in whitelist | Manual inspection before adding |
| Phase 2 | MEDIUM ⚠️ | Breaking changes in full rollout | Parse validation, blacklist fallback |
| Phase 3 | MEDIUM ⚠️ | Removing needed optimizations | Compare results before/after carefully |

---

## Open Questions

### 1. Should we auto-detect multiple hubs per event?

**Current State**: One hub pattern detected per event (largest duplicate group)

**Potential**: Could detect secondary/tertiary hub patterns automatically

**Decision**: DEFER until Phase 2 complete
- Current single-hub detection is working well
- Multiple hubs add complexity (overlap detection needed)
- Validate single-hub approach first, then expand if needed

---

### 2. Should we make MIN_CHOICES and MIN_TEXT_LENGTH configurable per-event?

**Current State**: Global constants (3 choices, 20 chars)

**Potential**: Some events might benefit from different thresholds

**Decision**: KEEP GLOBAL for now
- Simplicity is valuable
- If specific events need tuning, use blacklist + manual config
- Can revisit if many events need custom thresholds

---

### 3. How to handle events in both DIALOGUE_MENU_EVENTS and auto-detection?

**Current State**: Manual config runs during building, auto-detection in post-processing

**Overlap**: Same event could be processed twice (once manually, once auto)

**Current Behavior**: Auto-detection skips nodes already converted to refs by manual config

**Decision**: WORKS FINE, NO CHANGE NEEDED
- Natural precedence: manual config → auto-detection
- No conflicts observed
- Phase 3 will reduce overlap by moving events to auto-detection

---

## Related Files

**Implementation**:
- [scripts/parse/post-processing-hub-pattern-optimization.js](../parse/post-processing-hub-pattern-optimization.js) - Main implementation
- [scripts/parse/configs.js](../parse/configs.js) - Configuration (lines 196-215)
- [scripts/parse/parse-event-trees.js](../parse/parse-event-trees.js) - Pipeline integration

**Manual Hub Config** (to be reduced in Phase 3):
- [scripts/parse/configs.js](../parse/configs.js) - DIALOGUE_MENU_EVENTS (lines 30-120)

---

## Next Steps

**Immediate** (this week):
1. Run parser and review discovered hub candidates
2. Add 3-5 promising candidates to whitelist
3. Validate tree quality in visualizer
4. Repeat until whitelist reaches 15-20 events

**Short-term** (weeks 2-3):
1. Enable full rollout (Phase 2)
2. Monitor parse validation results
3. Create blacklist for problem cases

**Medium-term** (weeks 4-6):
1. Begin Phase 3 consolidation
2. Reduce DIALOGUE_MENU_EVENTS to critical-only
3. Implement structural dedup division of labor

---

## Author Notes

**Implementation Philosophy**:
We chose a simpler, more semantic approach than originally planned:
- Choice-based matching > Text signature matching
- BFS traversal > Recursive path finding
- "Same or -1 choice" > Threshold calculation
- Result: Cleaner code, better accuracy, easier maintenance

**Rollout Philosophy**:
Conservative whitelist → Full enablement → Consolidation
- Whitelist phase validates the approach works
- Full rollout maximizes impact
- Consolidation removes redundancy and complexity

**Date**: 2026-02-06
**Status**: Phase 1 in progress (8 events whitelisted)
