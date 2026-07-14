# Event-tree spacing engine

Custom multi-pass layout that runs **after** d3's `tree()` layout to fix what d3 can't:

1. **Variable node sizes.** d3's tree layout assumes uniform node sizes (`nodeSize` is one value for the whole tree). Event nodes vary hugely in width and height depending on their text, effects, requirements, and the current rendering settings, so d3's positions overlap.
2. **Multi-parent nodes (`refChildren`).** The event data isn't a strict tree — a node can be a direct child of one parent while also being referenced by other parents. d3 lays it out as a tree along the direct links only; the extra ref links look terrible unless the shared node is centered under _all_ of its parents.

## Horizontal passes (in run order)

Old pass numbering in parentheses, for cross-referencing older commits and comments.

1. **`centerChildrenUnderParents`** (1) — children in a row, centered under each parent; overlaps between families ignored.
2. **`centerMultiParentChildren`** (1.5) — nodes with multiple parents move to the average x of all their parents, clamped so the move can't create overlaps.
3. **`resolveOverlaps`** (2) — sweeps of: separate overlapping siblings, separate overlapping cousin blocks, recenter parent groups over shared children. On convergence, no same-depth overlaps remain.
4. **`tightenGaps`** (3) — removes the excess air the recentering leaves between sibling subtrees; middle-out, each shift clamped by the free space around the entire subtree.
5. **`centerMultiParentChildren` again** (4) — tightening can drag shared nodes off-center.

## Convergence caveat

`resolveOverlaps` and `tightenGaps` sweep until a full sweep changes nothing, capped at
`MAX_*_SWEEPS` (a `console.error` fires when the cap is hit). The known non-converging
case is a node that is a direct child of one parent **and** a refChild of several other
parents — the passes then fight over its position (overlap resolution pushes it one way,
multi-parent centering and recentering pull it back). Such events should be blacklisted
from refChildren creation in `parse-event-trees.js` (`REF_CHILDREN_BLACKLIST`) rather
than accommodated here.
