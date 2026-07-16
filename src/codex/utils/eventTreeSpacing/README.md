# Event-tree spacing engine

Layout for the event trees, solving the two things d3's built-in `tree()` can't:

1. **Variable node sizes.** d3's tree layout assumes uniform node sizes (`nodeSize` is one
   value for the whole tree). Event nodes vary hugely in width depending on their text,
   effects, requirements, and the current rendering settings.
2. **Multi-parent nodes (`refChildren`).** The event data isn't a strict tree — a node can
   be a direct child of one parent while also being referenced by other parents. Layout
   algorithms only see the direct links; the extra ref links look terrible unless the
   shared node is centered under _all_ of its parents.

## Horizontal pipeline (three steps)

1. **`flextree`** ([d3-flextree](https://github.com/Klortho/d3-flextree)) — a
   Reingold–Tilford tidy layout generalized to variable node sizes. Subtrees are laid out
   bottom-up and packed against each other's contours, then parents are centered over
   their children. One deterministic O(n) sweep; overlaps are impossible by construction.
   Each node's horizontal slot is its measured width plus `minHorizontalGap`, so adjacent
   nodes always have at least the minimum gap between their edges. The vertical slot size
   is constant, so rows land at `y = depth * VERTICAL_SPACING_DEFAULT`, exactly like the
   old `tree()` pre-layout.
2. **`centerMultiParentChildren`** — recenters sibling groups that have multiple parents
   (direct + refChildren) under the average x of all their parents. Siblings sharing the
   same parent set move as one group (individually they'd block each other at the minimum
   gap). Each group shift is clamped (`calculateMaxShiftForNode`, excluding the moving
   group from the obstacle check) so it can never introduce an overlap.
3. **`centerParentsOverSharedChildren`** — the complement for when step 2 is clamped
   (the children's subtrees have no room to slide): parent groups sharing children move —
   as nodes only, their subtrees stay put — over the average x of all their children,
   clamped within their own row. Runs bottom-up.

This replaced a greedy place-then-repair engine (center children → resolve overlaps →
tighten gaps, sweeping until convergence with safety caps). Contour packing makes all of
that unnecessary: there is nothing to repair and no convergence concept.

### Known limitation: crossing fans

When two shared-children fans interleave in the same rows (e.g. parents ordered
`A₁ B₁ A₂ B₂` where `A₁→c←A₂` and `B₁→c'←B₂`), only one fan can center; the other stays
clamped — its children are blocked by the first fan's subtrees and its parents by the
interposed parent nodes. The old iterative engine could settle both by repeatedly pushing
neighbors apart and recentering; a deterministic clamped pass cannot (the fans are
mutually coupled). Accepted trade-off — affected events at the time of the swap:
Overgrown Stone, Heart of the Temple, The Suntree, Forking Tunnel, The Voice, Suspended
Cage, Emberwyld Heights Finish, Noxlight Swamp Finish.

## Vertical pass

`adjustVerticalNodeSpacing` runs after the horizontal pipeline: per depth level it
measures the tightest parent→child edge gap (direct and refChildren links) and shifts the
level (and everything below) down to maintain the desired gap — chains of single children
pack tighter, and levels with a wide horizontal spread get extra room so links don't run
nearly horizontal.

`centerRootNodeHorizontally` is a final cosmetic fix for very small/simple trees, which
otherwise sit oddly far from the centered event header.
