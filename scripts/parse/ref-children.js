/* eslint-disable */
/**
 * Convert sibling and cousin refs into `refChildren` for nicer visualization.
 *
 * Reorders siblings/ancestors so ref nodes end up adjacent to their targets, then
 * replaces the `ref` field with `refChildren` (the target's children IDs).
 *
 * Three conversion strategies, applied in order per tree:
 * 1. Sibling refs (ref target shares the same parent)
 * 2. Single-child cousin refs (both ref node and target are single children)
 * 3. Non-single-child cousin refs (ref node's parent has multiple children)
 *
 * The two cousin strategies share one finder (`findConvertibleCousinRefs`) and differ
 * only in which refs they accept and how they reorder siblings for adjacency.
 */
const { OPTIMIZATION_PASS_CONFIG } = require('./configs.js')

/**
 * Build parent and node maps for a tree
 */
function buildParentAndNodeMaps(rootNode) {
  const parentMap = new Map() // nodeId -> parent node
  const nodeMap = new Map() // nodeId -> node

  function buildMaps(node, parent = null) {
    if (!node) return
    nodeMap.set(node.id, node)
    if (parent) {
      parentMap.set(node.id, parent)
    }
    if (node.children) {
      node.children.forEach((child) => buildMaps(child, node))
    }
  }

  buildMaps(rootNode)
  return { parentMap, nodeMap }
}

/**
 * Find the common ancestor at which the ancestor chains of a ref node's parent and its
 * target node's parent become siblings (direct children of the same node).
 *
 * If the two parents are themselves siblings, that shared parent is the common ancestor.
 * Otherwise walk up both chains in lockstep until two ancestors are siblings.
 * Returns null if the chains never become siblings at the same height.
 */
function findCommonSiblingAncestor(refNodeParent, targetNodeParent, parentMap) {
  const refParentParent = parentMap.get(refNodeParent.id)
  const targetParentParent = parentMap.get(targetNodeParent.id)
  if (!refParentParent || !targetParentParent) return null

  if (refParentParent.id === targetParentParent.id) {
    // The parents themselves are siblings — verify they are direct children
    if (
      refParentParent.children &&
      refParentParent.children.some((c) => c.id === refNodeParent.id) &&
      refParentParent.children.some((c) => c.id === targetNodeParent.id)
    ) {
      return refParentParent
    }
    return null
  }

  // The parents are cousins — walk up both chains until they become siblings
  let refCurrent = refParentParent
  let targetCurrent = targetParentParent

  while (refCurrent && targetCurrent) {
    const refParent = parentMap.get(refCurrent.id)
    const targetParent = parentMap.get(targetCurrent.id)

    if (refParent && targetParent && refParent.id === targetParent.id) {
      // Found common ancestor — verify both ancestors are direct children
      if (
        refParent.children &&
        refParent.children.some((c) => c.id === refCurrent.id) &&
        refParent.children.some((c) => c.id === targetCurrent.id)
      ) {
        return refParent
      }
    }

    refCurrent = refParent
    targetCurrent = targetParent
  }

  return null
}

/**
 * Find all convertible cousin refs in a tree: nodes whose ref points to a node under a
 * different parent, where the two parents' ancestor chains become siblings at a common
 * ancestor. Each entry is tagged with single-child flags that the two cousin conversion
 * strategies filter on.
 */
function findConvertibleCousinRefs(nodeMap, parentMap) {
  const cousinRefs = []

  for (const [nodeId, refNode] of nodeMap.entries()) {
    if (refNode.ref === undefined) continue

    const refNodeParent = parentMap.get(nodeId)
    if (!refNodeParent) continue

    const targetNode = nodeMap.get(refNode.ref)
    if (!targetNode) continue

    const targetNodeParent = parentMap.get(targetNode.id)
    if (!targetNodeParent) continue

    // Skip if same parent (sibling ref, already handled)
    if (refNodeParent.id === targetNodeParent.id) continue

    const commonAncestor = findCommonSiblingAncestor(refNodeParent, targetNodeParent, parentMap)
    if (!commonAncestor) continue

    cousinRefs.push({
      refNode,
      refNodeParent,
      targetNode,
      targetNodeParent,
      commonAncestor,
      refNodeIsSingleChild: !!(refNodeParent.children && refNodeParent.children.length === 1),
      targetNodeIsSingleChild: !!(
        targetNodeParent.children && targetNodeParent.children.length === 1
      ),
    })
  }

  return cousinRefs
}

/**
 * Convert sibling refs to refChildren structure
 *
 * When a node has a ref pointing to a sibling, this function:
 * 1. Moves the node to be immediately after its ref target
 * 2. Replaces the `ref` field with `refChildren` containing the target's children IDs
 *
 * Example transformation:
 * Before: [A(id:1, children:[10,11]), B(id:2), C(id:3, ref:1)]
 * After:  [A(id:1, children:[10,11]), C(id:3, refChildren:[10,11]), B(id:2)]
 */
function convertSiblingRefsInTree(rootNode) {
  let conversionsCount = 0

  function traverse(node) {
    if (!node || !node.children || node.children.length === 0) return

    // Handle sibling refs
    const reorderedChildren = []
    const processed = new Set()

    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i]

      if (processed.has(child.id)) continue

      // Add this child to the reordered list
      reorderedChildren.push(child)
      processed.add(child.id)

      // Check if any unprocessed siblings have refs pointing to this child (sibling ref)
      for (let j = 0; j < node.children.length; j++) {
        if (processed.has(node.children[j].id)) continue

        const potentialRefNode = node.children[j]

        // Check if this node has a ref pointing to the current child (sibling)
        if (potentialRefNode.ref !== undefined && potentialRefNode.ref === child.id) {
          // This is a sibling ref! Convert it.

          // Get the target's children IDs
          const refChildrenIds = child.children ? child.children.map((c) => c.id) : []

          // Create new node with refChildren instead of ref
          const convertedNode = {
            ...potentialRefNode,
            refChildren: refChildrenIds,
          }

          // Remove the ref field
          delete convertedNode.ref

          // Verify that this node doesn't have children (as per requirement)
          if (potentialRefNode.children && potentialRefNode.children.length > 0) {
            console.warn(
              `  ⚠️  Node ${potentialRefNode.id} has both ref and children - this shouldn't happen!`
            )
          }

          // Add the converted node immediately after its target
          reorderedChildren.push(convertedNode)
          processed.add(potentialRefNode.id)
          conversionsCount++
        }
      }
    }

    // Update the parent's children with the reordered list
    node.children = reorderedChildren

    // Recursively process this child's subtree
    for (const child of node.children) {
      traverse(child)
    }
  }

  traverse(rootNode)
  return conversionsCount
}

/**
 * Convert SIMPLE cousin refs (both ref node and target are single children) to refChildren
 *
 * 1. Reorders children at each common ancestor so the ref node's ancestor chain ends up
 *    adjacent to the target node's ancestor chain
 * 2. Replaces the `ref` field with `refChildren` containing the target's children IDs
 *
 * This handles cousin refs at ANY depth by walking up the tree to find where the parents
 * become siblings. For example, if A->B->C and D->E->F(ref:C), it finds that B and E's
 * parents (A and D) are siblings at the root level, and reorders A and D to be adjacent.
 *
 * Example transformations:
 * Direct cousin ref:
 * Before: [A(id:1, children:[C]), B(id:2, children:[D]), C(id:3, children:[E,F]), D(id:4, ref:3)]
 * After:  [A(id:1, children:[C]), B(id:2, children:[D]), C(id:3, children:[E,F]), D(id:4, refChildren:[E,F])]
 *
 * Deeper cousin ref:
 * Before: [A(id:1, children:[B]), B(id:2, children:[C]), C(id:3, children:[G]), D(id:4, children:[E]), E(id:5, children:[F]), F(id:6, ref:3)]
 * After:  [A(id:1, children:[B]), D(id:4, children:[E]), B(id:2, children:[C]), E(id:5, children:[F]), C(id:3, children:[G]), F(id:6, refChildren:[G])]
 *        (A and D are reordered so B and E are adjacent, making C and F cousins)
 */
function convertSingleChildCousinRefs(rootNode, cousinRefs, parentMap) {
  let conversionsCount = 0

  // Group cousin refs by their common ancestor
  const cousinRefsByAncestor = new Map()
  for (const cousinRef of cousinRefs) {
    const ancestorId = cousinRef.commonAncestor.id
    if (!cousinRefsByAncestor.has(ancestorId)) {
      cousinRefsByAncestor.set(ancestorId, [])
    }
    cousinRefsByAncestor.get(ancestorId).push(cousinRef)
  }

  // Process each ancestor level
  function handleCousinRefsAtAllDepths(node) {
    if (!node || !node.children || node.children.length === 0) return

    const refsAtThisAncestor = cousinRefsByAncestor.get(node.id) || []

    // Reorder grandparents so that cousin refs have adjacent parents
    if (refsAtThisAncestor.length > 0) {
      const grandparentAdjacency = new Map() // targetGrandparent -> refGrandparent (should be adjacent)

      for (const cousinRef of refsAtThisAncestor) {
        // Get the grandparents (parents of the parents)
        const targetGrandparent = parentMap.get(cousinRef.targetNodeParent.id)
        const refGrandparent = parentMap.get(cousinRef.refNodeParent.id)

        if (targetGrandparent && refGrandparent && targetGrandparent.id !== refGrandparent.id) {
          // Ensure refGrandparent comes right after targetGrandparent
          const existing = grandparentAdjacency.get(targetGrandparent.id)
          if (!existing || existing.id !== refGrandparent.id) {
            grandparentAdjacency.set(targetGrandparent.id, refGrandparent)
          }
        }
      }

      if (grandparentAdjacency.size > 0) {
        const reordered = []
        const processedGrandparents = new Set()

        for (const grandparent of node.children) {
          if (processedGrandparents.has(grandparent.id)) continue

          reordered.push(grandparent)
          processedGrandparents.add(grandparent.id)

          // Check if this grandparent needs its ref grandparent adjacent
          const refGrandparent = grandparentAdjacency.get(grandparent.id)
          if (refGrandparent && !processedGrandparents.has(refGrandparent.id)) {
            // Find refGrandparent in the original array and add it next
            const refGrandparentIndex = node.children.findIndex((p) => p.id === refGrandparent.id)
            if (refGrandparentIndex !== -1) {
              reordered.push(node.children[refGrandparentIndex])
              processedGrandparents.add(refGrandparent.id)
            }
          }
        }

        // Add any remaining unprocessed grandparents
        for (const grandparent of node.children) {
          if (!processedGrandparents.has(grandparent.id)) {
            reordered.push(grandparent)
          }
        }

        node.children = reordered
      }

      // Now convert cousin refs to refChildren
      for (const cousinRef of refsAtThisAncestor) {
        const refChildrenIds = cousinRef.targetNode.children
          ? cousinRef.targetNode.children.map((c) => c.id)
          : []
        cousinRef.refNode.refChildren = refChildrenIds
        delete cousinRef.refNode.ref
        conversionsCount++
      }
    }

    // Recursively process children to handle cousin refs at deeper levels
    for (const child of node.children) {
      handleCousinRefsAtAllDepths(child)
    }
  }

  handleCousinRefsAtAllDepths(rootNode)

  return conversionsCount
}

/**
 * Convert non-single-child cousin refs to refChildren structure
 *
 * Special case: When a node has a ref pointing to a cousin, but the ref node is NOT a single child
 * (its parent has multiple children). In this case, we reorder siblings in BOTH parents:
 * 1. Reorder siblings in target node's parent: place target nodes last
 * 2. Reorder siblings in ref node's parent: place ref nodes first
 * This positions ref nodes and target nodes to be adjacent to each other, then converts ref to refChildren.
 *
 * Example transformation:
 * Before: A(children:[C,D]), B(children:[E,F]), C(children:[G]), D, E, F(ref:C)
 * After:  A(children:[D,C]), B(children:[F,E]), D, C(children:[G]), F(refChildren:[G]), E
 *        (C moved to last in A, F moved to first in B, making them adjacent)
 */
function convertNonSingleChildCousinRefs(cousinRefs) {
  let conversionsCount = 0

  // Group cousin refs by both the ref node's parent and target node's parent
  // We need to reorder siblings in both parents
  const cousinRefsByRefParent = new Map()
  const cousinRefsByTargetParent = new Map()

  for (const cousinRef of cousinRefs) {
    const refParentId = cousinRef.refNodeParent.id
    const targetParentId = cousinRef.targetNodeParent.id

    if (!cousinRefsByRefParent.has(refParentId)) {
      cousinRefsByRefParent.set(refParentId, { parent: cousinRef.refNodeParent, refs: [] })
    }
    cousinRefsByRefParent.get(refParentId).refs.push(cousinRef)

    if (!cousinRefsByTargetParent.has(targetParentId)) {
      cousinRefsByTargetParent.set(targetParentId, { parent: cousinRef.targetNodeParent, refs: [] })
    }
    cousinRefsByTargetParent.get(targetParentId).refs.push(cousinRef)
  }

  // First, reorder siblings in target node's parent: place target nodes last
  // This positions them to be closest to ref nodes (which will be first in their parent)
  cousinRefsByTargetParent.forEach(({ parent, refs }) => {
    if (!parent.children) return

    const targetNodes = new Set(refs.map((cr) => cr.targetNode.id))
    const targetNodeList = []
    const otherSiblings = []

    // Separate target nodes from other siblings, preserving original order within each group
    for (const sibling of parent.children) {
      if (targetNodes.has(sibling.id)) {
        targetNodeList.push(sibling)
      } else {
        otherSiblings.push(sibling)
      }
    }

    // Place target nodes last (so they're closest to ref nodes)
    parent.children = [...otherSiblings, ...targetNodeList]
  })

  // Then, reorder siblings in ref node's parent: place ref nodes first
  cousinRefsByRefParent.forEach(({ parent, refs }) => {
    if (!parent.children) return

    const refNodes = new Set(refs.map((cr) => cr.refNode.id))
    const refNodeList = []
    const otherSiblings = []

    // Separate ref nodes from other siblings, preserving original order within each group
    for (const sibling of parent.children) {
      if (refNodes.has(sibling.id)) {
        refNodeList.push(sibling)
      } else {
        otherSiblings.push(sibling)
      }
    }

    // Place ref nodes first (so they're closest to target nodes)
    parent.children = [...refNodeList, ...otherSiblings]

    // Convert refs to refChildren
    for (const cousinRef of refs) {
      const refChildrenIds = cousinRef.targetNode.children
        ? cousinRef.targetNode.children.map((c) => c.id)
        : []
      cousinRef.refNode.refChildren = refChildrenIds
      delete cousinRef.refNode.ref
      conversionsCount++
    }
  })

  return conversionsCount
}

/**
 * Convert sibling and cousin refs to refChildren structure within one tree
 *
 * Runs the three strategies in order: sibling refs first (in-place traversal), then the
 * two cousin strategies over a single shared scan of the remaining refs. Sibling
 * conversions delete their `ref` fields before the scan, and the cousin strategies'
 * filters (single-child vs non-single-child ref node) are mutually exclusive, so no ref
 * is converted twice.
 */
function convertSiblingAndCousinRefsToRefChildrenInTree(rootNode, eventName) {
  const skipCousinConversions = OPTIMIZATION_PASS_CONFIG.COUSIN_REF_BLACKLIST.includes(eventName)
  const skipComplexCousinConversions =
    OPTIMIZATION_PASS_CONFIG.COMPLEX_COUSIN_REF_BLACKLIST.includes(eventName)

  const siblingConversions = convertSiblingRefsInTree(rootNode)

  if (skipCousinConversions) return siblingConversions

  // Cousin conversions never change parentage (only sibling order and ref -> refChildren),
  // so one up-front scan serves both strategies.
  const { parentMap, nodeMap } = buildParentAndNodeMaps(rootNode)
  const cousinRefs = findConvertibleCousinRefs(nodeMap, parentMap)

  const cousinConversions = convertSingleChildCousinRefs(
    rootNode,
    cousinRefs.filter((cr) => cr.refNodeIsSingleChild && cr.targetNodeIsSingleChild),
    parentMap
  )
  const complexCousinConversions = skipComplexCousinConversions
    ? 0
    : convertNonSingleChildCousinRefs(cousinRefs.filter((cr) => !cr.refNodeIsSingleChild))

  return siblingConversions + cousinConversions + complexCousinConversions
}

/**
 * Hoist pure stand-in refChildren nodes into their parent.
 *
 * Deduplication leaves the duplicate as a stand-in node carrying the link (a node has
 * exactly one parent, so the second occurrence must exist to hold the ref), and the
 * conversion above turns nearby links into refChildren. When that stand-in is a PURE
 * copy of the node it stands for — identical on every rendered field — and is its
 * parent's only child, the stand-in itself is redundant: the parent can point its
 * converging line directly at the original node instead.
 *
 * Before: [choice A] -> [study the woman {children: X, Y}]   [choice B] -> [study the woman {refChildren: X, Y}]
 * After:  [choice A] -> [study the woman {children: X, Y}]   [choice B {refChildren: [study the woman]}]
 *
 * Only refChildren stand-ins are hoisted (the conversion pass already judged those
 * targets nearby); `ref` stand-ins stay as jump links — converging lines to distant
 * targets are exactly the layout problem the cousin blacklists exist for.
 */
function hoistPureStandInRefNodesInTree(rootNode) {
  let hoistsCount = 0

  // Repeat until stable: a hoist can expose another hoistable stand-in chain.
  while (true) {
    const { parentMap, nodeMap } = buildParentAndNodeMaps(rootNode)

    // Ids referenced by any ref/refChildren — a stand-in someone else points at can't be deleted
    const referencedIds = new Set()
    for (const node of nodeMap.values()) {
      if (node.ref !== undefined) referencedIds.add(node.ref)
      if (node.refChildren) node.refChildren.forEach((id) => referencedIds.add(id))
    }

    const isPureCopy = (a, b) =>
      (a.text ?? null) === (b.text ?? null) &&
      (a.type ?? null) === (b.type ?? null) &&
      (a.choiceLabel ?? null) === (b.choiceLabel ?? null) &&
      (a.numContinues ?? null) === (b.numContinues ?? null) &&
      JSON.stringify(a.requirements ?? null) === JSON.stringify(b.requirements ?? null) &&
      JSON.stringify(a.effects ?? null) === JSON.stringify(b.effects ?? null)

    let hoistedThisRound = false
    for (const node of nodeMap.values()) {
      if (!node.refChildren || node.refChildren.length === 0) continue
      if (node.children && node.children.length > 0) continue
      if (referencedIds.has(node.id)) continue

      const parent = parentMap.get(node.id)
      if (!parent || !parent.children || parent.children.length !== 1) continue
      if (parent.ref !== undefined || parent.refChildren !== undefined) continue

      // The original this node stands for: the common parent of its refChildren targets
      const firstTarget = nodeMap.get(node.refChildren[0])
      if (!firstTarget) continue
      const original = parentMap.get(firstTarget.id)
      if (!original || original === node || original === parent) continue
      if (!node.refChildren.every((id) => parentMap.get(nodeMap.get(id)?.id) === original)) continue

      if (!isPureCopy(node, original)) continue

      parent.refChildren = [original.id]
      delete parent.children
      hoistsCount++
      hoistedThisRound = true
    }

    if (!hoistedThisRound) break
  }

  return hoistsCount
}

/**
 * Hoist pure stand-in refChildren nodes across all event trees
 */
function hoistPureStandInRefNodes(eventTrees) {
  let totalHoists = 0
  const eventsWithHoists = []

  eventTrees.forEach((tree) => {
    if (!tree.rootNode) return
    const hoists = hoistPureStandInRefNodesInTree(tree.rootNode)
    if (hoists > 0) {
      eventsWithHoists.push({ name: tree.name, hoists })
      totalHoists += hoists
    }
  })

  return { totalHoists, eventsWithHoists }
}

/**
 * Convert sibling refs to refChildren across all event trees
 */
function convertSiblingAndCousinRefsToRefChildren(eventTrees) {
  let totalConversions = 0
  const eventsWithConversions = []

  eventTrees.forEach((tree) => {
    if (!tree.rootNode) {
      return
    }

    const conversions = convertSiblingAndCousinRefsToRefChildrenInTree(tree.rootNode, tree.name)

    if (conversions > 0) {
      eventsWithConversions.push({
        name: tree.name,
        conversions,
      })
      totalConversions += conversions
    }
  })

  return { totalConversions, eventsWithConversions }
}


module.exports = {
  convertSiblingAndCousinRefsToRefChildren,
  hoistPureStandInRefNodes,
}
