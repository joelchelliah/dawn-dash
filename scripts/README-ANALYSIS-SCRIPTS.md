# Event Analysis Scripts

## analyze-all-events-final.js

**Purpose**: Analyzes all 182 events in data/events.json to find hidden Ink mechanics that won't be captured by standard parsing.

**Usage**:
```bash
node analyze-all-events-final.js
```

**Output Files**:
- `optimizationIdeas/potentially-hidden-ink-mechanics.md` - Full detailed analysis (30KB)
- `optimizationIdeas/ACTIONABLE-FIXES-SUMMARY.md` - Actionable fixes and implementation guide (7.7KB)
- `optimizationIdeas/EVENTS-WITH-KNOTS-AFTER-DONE.txt` - Quick reference list of 34 events needing fixes (1.1KB)

**What It Detects**:

1. **Knots After DONE** (CRITICAL)
   - Events with knots defined after the main DONE statement
   - These are only accessible via external game triggers
   - Found in 34 events (same pattern as Frozen Heart bug)

2. **Special Knots**
   - Knots with names suggesting puzzle/challenge mechanics
   - Names like "puzzlesuccess", "fail", "defeat", "reward"
   - Found in 8 events

3. **Conditional Logic**
   - Quest flags that gate content
   - Talent checks that create branches
   - Found in 59 events

**Key Findings**:
- 34 events need the same fix as Frozen Heart
- Estimated 150-250 new nodes will be added to the tree once fixed
- Priority: The Deal (14 knots), The Ferryman (12 knots), Abandoned Backpack (12 knots)

**Last Run**: 2026-01-25
