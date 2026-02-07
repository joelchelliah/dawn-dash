# TalentTree Improvements - Patterns from EventTree

This document lists good patterns from EventTree that could be applied to TalentTree, ordered by priority.

---

### 1. - Removed -

### 2. **Extract Helper Rendering Functions**
**Location**: All rendering logic is inline in TalentTree

**Current Pattern (TalentTree)**:
- All rendering logic is inline within the main `useEffect` in [index.tsx](src/codex/components/ResultsPanels/TalentResultsPanel/TalentTree/index.tsx)
- ~750 lines in a single file with deeply nested logic

**Better Pattern (EventTree)**: [EventTree/index.tsx:639-930](src/codex/components/ResultsPanels/EventResultsPanel/EventTree/index.tsx#L639-L930)
```typescript
function renderNodeText(node, data, width, height, ...) { ... }
function renderChoiceLabel(node, choiceLabel, width, height, ...) { ... }
function renderEffectsBox(node, effects, ...) { ... }
function renderRequirementsBox(node, requirements, ...) { ... }
function renderContinueIndicator(node, ...) { ... }
function renderLoopIndicator(node, ...) { ... }
```

**Why**:
- Breaks down complex rendering into testable, reusable functions
- Makes the main render loop much easier to understand
- Each function has a clear responsibility
- Easier to modify individual rendering aspects
- Better code organization and maintainability

**Impact**: Medium risk refactor, significant maintainability improvement

**Suggested Functions for TalentTree**:
- `renderRequirementNode()` - For class/energy/event/card/offer requirement nodes
- `renderRequirementIcons()` - For the icon rendering logic (lines 244-280)
- `renderTalentNode()` - For the main talent card rendering
- `renderTalentName()` - For name rendering (lines 366-384)
- `renderTalentDescription()` - For description rendering (lines 406-465)
- `renderTalentRequirements()` - For the "Requires:" text (lines 386-403)
- `renderBlightbaneLink()` - For the Blightbane link (lines 467-504)
- `renderKeywords()` - For keywords display (lines 507-524)
- `renderExpansionButton()` - For the expand/collapse button (lines 660-715)

---

### 3. **Split Complex Logic Into Separate Files**
**Location**: All TalentTree logic is in one file

**Current Pattern (TalentTree)**:
- Everything in [TalentTree/index.tsx](src/codex/components/ResultsPanels/TalentResultsPanel/TalentTree/index.tsx) (748 lines)
- Only [links.ts](src/codex/components/ResultsPanels/TalentResultsPanel/TalentTree/links.ts) is separated (53 lines)

**Better Pattern (EventTree)**:
- [index.tsx](src/codex/components/ResultsPanels/EventResultsPanel/EventTree/index.tsx) - Main component (945 lines, but with extracted helpers)
- [links.ts](src/codex/components/ResultsPanels/EventResultsPanel/EventTree/links.ts) - Link rendering logic (461 lines)
- [badges.ts](src/codex/components/ResultsPanels/EventResultsPanel/EventTree/badges.ts) - Badge rendering logic
- [useEventTreeZoom.ts](src/codex/components/ResultsPanels/EventResultsPanel/EventTree/useEventTreeZoom.ts) - Zoom calculation logic

**Why**:
- Separates concerns (rendering, interaction, utilities)
- Makes files easier to navigate
- Reduces cognitive load when working on specific features
- Improves testability

**Impact**: Low risk refactor (mostly moving code), significant organization improvement

**Suggested Files for TalentTree**:
- Keep [index.tsx](src/codex/components/ResultsPanels/TalentResultsPanel/TalentTree/index.tsx) - Main component
- Keep [links.ts](src/codex/components/ResultsPanels/TalentResultsPanel/TalentTree/links.ts) - Link rendering
- Add `requirementNodes.ts` - Requirement node rendering (class, energy, event, card, offer)
- Add `talentNodes.ts` - Main talent card rendering
- Add `indicators.ts` - Requirement indicators on links (lines 528-658)
- Add `expansionButtons.ts` - Expansion button logic (lines 660-715)

---

## Medium Priority

### 4. **Consistent Node Filtering Pattern**
**Location**: [TalentTree/index.tsx:178](src/codex/components/ResultsPanels/TalentResultsPanel/TalentTree/index.tsx#L178)

**Current Pattern (TalentTree)**:
```typescript
nodes.each(function ({ data }, _index) {
  if (!data.type) {
    throw new Error(`Node ${data.name} has no type!`)
  }
  const nodeElement = select(this)
  const isRequirementNode = data.type !== TalentTreeNodeType.TALENT

  if (isRequirementNode) {
    // render requirement node
  } else {
    // render talent node
  }
})
```

**Better Pattern (EventTree)**: [EventTree/index.tsx:232-249](src/codex/components/ResultsPanels/EventResultsPanel/EventTree/index.tsx#L232-L249)
```typescript
// Helper function defined once
const shouldSkipDrawingNodeRectangle = (node: EventTreeNode): boolean =>
  isEmojiOnlyNode(node, isCompact, showContinuesTags, showLoopingIndicator)

// Draw node glow rectangles
nodes.each(function (d) {
  if (shouldSkipDrawingNodeRectangle(d.data)) return
  // ... render glow
})

// Draw node rectangles
nodes.each(function (d) {
  if (shouldSkipDrawingNodeRectangle(d.data)) return
  // ... render node
})
```

**Why**:
- Separates rendering phases (glow, background, content, overlays)
- Makes each rendering pass clearer and more focused
- Helper functions reduce duplication
- Easier to add conditional rendering logic

**Impact**: Medium risk refactor, improves clarity

**Suggested Phases for TalentTree**:
1. Draw glow rectangles
2. Draw node backgrounds (circles for requirement nodes, rects for talents)
3. Draw node content (icons, text, descriptions)
4. Draw separators
5. Draw requirement indicators
6. Draw expansion buttons

---

### 5. **Extract Dimension Calculations into Helper Functions**
**Location**: Inline dimension calculations throughout TalentTree

**Current Pattern (TalentTree)**:
```typescript
const descriptionHeight = isCollapsed
  ? collapsedDescriptionHeight
  : Math.max(minDescriptionHeight, descLines.length * descriptionLineHeight) +
    descriptionLinesPadding
const extraRequirementHeight = additionalRequirements.length ? requirementsHeight : 0
const matchingKeywordsHeight = shouldShowKeywords ? keywordsHeight : 0
const blightbaneHeight = shouldShowBlightbaneLink ? blightbaneLinkHeight : 0
const additionalHeight = descriptionHeight + extraRequirementHeight + blightbaneHeight
const dynamicNodeHeight = nameHeight + additionalHeight + 6
```

**Better Pattern (EventTree)**: [EventTree/index.tsx:276-308](src/codex/components/ResultsPanels/EventResultsPanel/EventTree/index.tsx#L276-L308)
```typescript
// Uses helper functions from eventNodeDimensions.ts
const { height: reqBoxHeight, margin: reqBoxMarginBase } =
  calculateRequirementsBoxDimensions(data, data.choiceLabel.length > 0)

const { height: loopIndicatorHeightBase, margin: loopIndicatorMargin } =
  calculateIndicatorDimensions('loop', hasLoopingIndicator, ...)

const { height: effectsBoxHeight, margin: effectsBoxMargin } =
  calculateEffectsBoxDimensions(data, currentNodeWidth, isCompact, nodeHasText)
```

**Why**:
- Centralizes dimension logic
- Returns both dimension AND margin in one call
- Makes rendering code focus on positioning, not calculation
- Easier to test dimension calculations separately
- Already partially done with `talentNodeDimensions.ts`, but could be more consistent

**Impact**: Low-Medium risk refactor, improves clarity

**Note**: TalentTree already has `talentNodeDimensions.ts` - just needs more consistent usage

---

### 6. **Use Descriptive CSS Classes with Node Type Variants**
**Location**: Throughout both files

**Current Pattern (TalentTree)**:
```typescript
.attr('class', cx('talent-node', `talent-node--tier-${data.tier || 0}`))
```

**Better Pattern (EventTree)**:
```typescript
.attr('class', cx('event-node', `event-node--${nodeType}`))
.attr('class', cx('event-node-text', `event-node-text--${nodeType}`))
```

**Why**:
- Node type is semantic and easier to understand than tier
- Makes styling more flexible
- Clearer separation between node categories

**Impact**: Low risk improvement, better semantics

**Note**: Both already do this well - TalentTree uses tier, EventTree uses type. Just document this is intentional.

---

## Low Priority

### 7. **Consistent Glow Filter Creation**
**Location**: [TalentTree/index.tsx:735-747](src/codex/components/ResultsPanels/TalentResultsPanel/TalentTree/index.tsx#L735-L747), [EventTree/index.tsx:932-944](src/codex/components/ResultsPanels/EventResultsPanel/EventTree/index.tsx#L932-L944)

**Current Pattern (Both)**:
Both use identical glow filter creation:
```typescript
const createGlowFilter = (
  defs: Selection<SVGDefsElement, unknown, null, undefined>,
  filterId: string
): void => {
  const blurAmount = '4'
  const filter = defs.append('filter').attr('id', filterId)
  filter.append('feGaussianBlur').attr('stdDeviation', blurAmount).attr('result', 'coloredBlur')
  const merge = filter.append('feMerge')
  merge.append('feMergeNode').attr('in', 'coloredBlur')
  merge.append('feMergeNode').attr('in', 'SourceGraphic')
}
```

**Better Pattern**:
Extract to shared utility in `@/codex/utils/d3Filters.ts` or similar

**Why**:
- DRY principle
- Single source of truth for filter definitions
- Easier to add more filter types
- Could add configurable blur amounts

**Impact**: Very low risk, minor improvement

---

### 8. **Document Magic Numbers with Constants**
**Location**: Throughout both files

**Current Pattern (TalentTree)**:
Already well done with constants in [talentTreeValues.ts](src/codex/constants/talentTreeValues.ts)

**Better Pattern (EventTree)**:
Also well done with constants in [eventTreeValues.ts](src/codex/constants/eventTreeValues.ts)

**Why**:
- Both already follow this pattern well
- Keep maintaining this discipline

**Impact**: Already done well in both

---

## Notes

### Patterns TalentTree Does Better Than EventTree:

1. **Pre-caching dimensions** - TalentTree caches all node dimensions before rendering for better performance
2. **Separation of dimension logic** - `talentNodeDimensions.ts` is well-structured
3. **Use of foreignObject for HTML rendering** - Allows richer content with images
4. **Type safety** - Better TypeScript types for node data

### Patterns Both Do Well:

1. **Extracting link logic** - Both have separate `links.ts` files
2. **Using constants** - Both have comprehensive constants files
3. **CSS Modules** - Both use SCSS modules consistently
4. **Responsive positioning** - Both calculate positions dynamically

---

## Recommended Implementation Order

1. **Start with #2** (Extract Helper Rendering Functions) - Biggest maintainability win
2. **Then #3** (Split Into Separate Files) - Natural follow-up after extracting functions
3. **Then #4** (Consistent Node Filtering) - Will be easier after the above
4. **Then #1** (tspan to text) - Lower risk once structure is cleaner
5. **Then #5** (Dimension Calculations) - Fine-tune after structure is solid
6. **Finally #6, #7, #8** - Polish and cleanup

Each step should be done in a separate commit for easy rollback if needed.
