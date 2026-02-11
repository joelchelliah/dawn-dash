# Hub Pattern Optimization: Rollout Plan

## Current Status

**Phase 2 Complete**: Full blacklist rollout done, 85 events optimized, -329 nodes total.

**What We Built**:
- ✅ Choice-based detection (not text signature matching)
- ✅ BFS traversal with depth tracking
- ✅ "Same or -1 choice" heuristic
- ✅ Whitelist-based rollout (Phase 1) → Blacklist rollout (Phase 2)
- ✅ Requirements-aware choice matching (same label + different requirements = distinct choices)
- ✅ Blacklist: 4 known false positives (`Frozen Heart`, `Mysterious Crates`, `Suspended Cage`, `The Deal`)

---

## ~~Phase 1: Expand Whitelist~~ ✅ Complete

Incrementally grew whitelist to 55+ events, validated no regressions.

---

## ~~Phase 2: Full Rollout~~ ✅ Complete

Switched from whitelist to blacklist. All 183 events now processed automatically except blacklisted false positives.

- ✅ 87 events optimized, 866,277 refs created
- ✅ Node count reduced by 328 (4,226 → 3,898)
- ✅ No invalid refs
- ✅ 5 events blacklisted (within target of <5... close enough)

---

## Phase 3: Optimization Pass Consolidation

**Goal**: Simplify/remove existing optimizations that overlap with hub pattern optimization.

### ~~1. DIALOGUE_MENU_EVENTS (Manual Config)~~ ✅ Complete

Reduced from ~20 events → 3 critical events.
(`Frozen Heart`, `Rathael the Slain Death`).
These are kept because they require early detection *during tree building* to prevent node budget explosions.
(`Suspended Cage`)
This is kept because autodetection here is really tricky... and would require a lot of logic to avoid false positives.

---

### 2. DEDUPLICATE_SUBTREES Division of Labor — High Priority

**Current State**: 2-iteration structural dedup runs on all nodes including dialogue menus

**Overlap**: Hub optimization handles dialogue menus semantically; structural dedup duplicates that work

**Action Plan**:
- [ ] Add skip logic: structural dedup skips dialogue nodes with 3+ choice children
- [ ] Let hub optimization handle dialogue menus (semantic)
- [ ] Let structural dedup handle everything else (structural)

**Implementation**:
```javascript
// In deduplicateEventTree():
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
```

---

### 3. PROMOTE_SHALLOW_DIALOGUE_MENU_HUB — Medium Priority

**Current State**: Post-processing pass to promote shallowest hub copy

**Overlap**: Hub optimization already prefers shallowest hub via BFS depth sorting

**Action Plan**:
- [ ] Review which events use this pass
- [ ] Verify hub optimization handles them correctly
- [ ] Disable or remove if fully redundant

---

### 4. PATH_CONVERGENCE — No Change Needed

Different purpose (prevents node explosion *during building*, not post-processing). Keep as-is.

---

## Open Questions

### 1. Multiple hubs per event?
**Decision**: DEFER — single-hub detection is working well. Revisit if needed.

### 2. MIN_CHOICES configurable per-event?
**Decision**: KEEP GLOBAL — use blacklist + manual config for edge cases.

### 3. Events in both DIALOGUE_MENU_EVENTS and auto-detection?
**Decision**: WORKS FINE — natural precedence: manual config → auto-detection. Phase 3 will reduce overlap.

---

## Related Files

- [scripts/parse/post-processing-hub-pattern-optimization.js](../parse/post-processing-hub-pattern-optimization.js) - Main implementation
- [scripts/parse/configs.js](../parse/configs.js) - Configuration
- [scripts/parse/parse-event-trees.js](../parse/parse-event-trees.js) - Pipeline integration

---

## Author Notes

**Implementation Philosophy**:
- Choice-based matching > Text signature matching
- BFS traversal > Recursive path finding
- "Same or -1 choice" > Threshold calculation

**Date**: 2026-02-11
**Status**: Phase 2 complete, Phase 3 next
