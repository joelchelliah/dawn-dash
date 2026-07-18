/* eslint-disable */
/**
 * Convert sibling and cousin refs into `refChildren` for nicer visualization.
 *
 * Reorders siblings/ancestors so ref nodes end up adjacent to their targets, then
 * replaces the `ref` field with `refChildren` (the target's children IDs).
 */
const { OPTIMIZATION_PASS_CONFIG } = require('./configs.js')

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
 * Convert SIMPLE cousin refs to refChildren structure
 *
 * When a node has a ref pointing to a cousin (and both are single children):
 * 1. Finds the common ancestor where the parents of the ref node and target node are siblings
 * 2. Ensures those parent nodes are adjacent at that ancestor level
 * 3. Replaces the `ref` field with `refChildren` containing the target's children IDs
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
function convertCousinRefsInTree(rootNode) {
  let conversionsCount = 0

  // Build parent map and node map
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

  // Find all cousin refs in the tree and process them
  function findAllCousinRefs() {
    const allCousinRefs = []

    // Find all nodes that have refs
    for (const [nodeId, refNode] of nodeMap.entries()) {
      if (refNode.ref === undefined) continue

      const refNodeParent = parentMap.get(nodeId)
      if (!refNodeParent) continue

      // Find the target node being referenced
      const targetNode = nodeMap.get(refNode.ref)
      if (!targetNode) continue

      const targetNodeParent = parentMap.get(targetNode.id)
      if (!targetNodeParent) continue

      // Skip if same parent (sibling ref, already handled)
      if (refNodeParent.id === targetNodeParent.id) continue

      // Find the common ancestor where the parents of refNode and targetNode are siblings
      // We need to check if refNodeParent and targetNodeParent are siblings (direct children of same node)
      let commonAncestor = null

      // Get the grandparents (parents of the parents)
      const refParentParent = parentMap.get(refNodeParent.id)
      const targetParentParent = parentMap.get(targetNodeParent.id)

      if (refParentParent && targetParentParent) {
        if (refParentParent.id === targetParentParent.id) {
          // The parents themselves are siblings (direct children case)
          // Check if they are direct children
          if (refParentParent.children) {
            const refParentIsChild = refParentParent.children.some((c) => c.id === refNodeParent.id)
            const targetParentIsChild = refParentParent.children.some(
              (c) => c.id === targetNodeParent.id
            )
            if (refParentIsChild && targetParentIsChild) {
              commonAncestor = refParentParent
            }
          }
        } else {
          // The parents are cousins - check if their parents (grandparents) are siblings
          // Walk up the tree to find where the grandparents become siblings
          let refGrandparentCurrent = refParentParent
          let targetGrandparentCurrent = targetParentParent

          // Check all ancestors until we find where they're siblings
          while (refGrandparentCurrent && targetGrandparentCurrent) {
            const refGrandparentParent = parentMap.get(refGrandparentCurrent.id)
            const targetGrandparentParent = parentMap.get(targetGrandparentCurrent.id)

            if (
              refGrandparentParent &&
              targetGrandparentParent &&
              refGrandparentParent.id === targetGrandparentParent.id
            ) {
              // Found common ancestor - verify grandparents are direct children
              if (refGrandparentParent.children) {
                const refGrandparentIsChild = refGrandparentParent.children.some(
                  (c) => c.id === refGrandparentCurrent.id
                )
                const targetGrandparentIsChild = refGrandparentParent.children.some(
                  (c) => c.id === targetGrandparentCurrent.id
                )
                if (refGrandparentIsChild && targetGrandparentIsChild) {
                  commonAncestor = refGrandparentParent
                  break
                }
              }
            }

            refGrandparentCurrent = refGrandparentParent
            targetGrandparentCurrent = targetGrandparentParent
          }
        }
      }

      if (commonAncestor) {
        // Check if both nodes are single children
        const refNodeIsSingleChild = refNodeParent.children && refNodeParent.children.length === 1
        const targetNodeIsSingleChild =
          targetNodeParent.children && targetNodeParent.children.length === 1

        if (refNodeIsSingleChild && targetNodeIsSingleChild) {
          allCousinRefs.push({
            refNode,
            refNodeParent,
            targetNode,
            targetNodeParent,
            commonAncestor,
          })
        }
      }
    }

    return allCousinRefs
  }

  // Group cousin refs by their common ancestor
  const allCousinRefs = findAllCousinRefs()
  const cousinRefsByAncestor = new Map()

  for (const cousinRef of allCousinRefs) {
    const ancestorId = cousinRef.commonAncestor.id
    if (!cousinRefsByAncestor.has(ancestorId)) {
      cousinRefsByAncestor.set(ancestorId, [])
    }
    cousinRefsByAncestor.get(ancestorId).push(cousinRef)
  }

  // Process each ancestor level
  function handleCousinRefsAtAllDepths(node) {
    if (!node || !node.children || node.children.length === 0) return

    const cousinRefs = cousinRefsByAncestor.get(node.id) || []

    // Reorder grandparents so that cousin refs have adjacent parents
    if (cousinRefs.length > 0) {
      const grandparentAdjacency = new Map() // targetGrandparent -> refGrandparent (should be adjacent)

      for (const cousinRef of cousinRefs) {
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
      for (const cousinRef of cousinRefs) {
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
 *
 */
function convertNonSingleChildCousinRefsInTree(rootNode) {
  let conversionsCount = 0

  // Build parent map and node map
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

  // Find all cousin refs where ref node is not a single child
  function findAllNonSingleChildCousinRefs() {
    const allCousinRefs = []

    // Find all nodes that have refs
    for (const [nodeId, refNode] of nodeMap.entries()) {
      if (refNode.ref === undefined) continue

      const refNodeParent = parentMap.get(nodeId)
      if (!refNodeParent) continue

      // Skip if ref node is a single child (handled by convertCousinRefsInTree)
      if (refNodeParent.children && refNodeParent.children.length === 1) continue

      // Find the target node being referenced
      const targetNode = nodeMap.get(refNode.ref)
      if (!targetNode) continue

      const targetNodeParent = parentMap.get(targetNode.id)
      if (!targetNodeParent) continue

      // Skip if same parent (sibling ref, already handled)
      if (refNodeParent.id === targetNodeParent.id) continue

      // Find the common ancestor where the parents of refNode and targetNode are siblings
      let commonAncestor = null

      // Get the grandparents (parents of the parents)
      const refParentParent = parentMap.get(refNodeParent.id)
      const targetParentParent = parentMap.get(targetNodeParent.id)

      if (refParentParent && targetParentParent) {
        if (refParentParent.id === targetParentParent.id) {
          // The parents themselves are siblings (direct children case)
          // Check if they are direct children
          if (refParentParent.children) {
            const refParentIsChild = refParentParent.children.some((c) => c.id === refNodeParent.id)
            const targetParentIsChild = refParentParent.children.some(
              (c) => c.id === targetNodeParent.id
            )
            if (refParentIsChild && targetParentIsChild) {
              commonAncestor = refParentParent
            }
          }
        } else {
          // The parents are cousins - check if their parents (grandparents) are siblings
          // Walk up the tree to find where the grandparents become siblings
          let refGrandparentCurrent = refParentParent
          let targetGrandparentCurrent = targetParentParent

          // Check all ancestors until we find where they're siblings
          while (refGrandparentCurrent && targetGrandparentCurrent) {
            const refGrandparentParent = parentMap.get(refGrandparentCurrent.id)
            const targetGrandparentParent = parentMap.get(targetGrandparentCurrent.id)

            if (
              refGrandparentParent &&
              targetGrandparentParent &&
              refGrandparentParent.id === targetGrandparentParent.id
            ) {
              // Found common ancestor - verify grandparents are direct children
              if (refGrandparentParent.children) {
                const refGrandparentIsChild = refGrandparentParent.children.some(
                  (c) => c.id === refGrandparentCurrent.id
                )
                const targetGrandparentIsChild = refGrandparentParent.children.some(
                  (c) => c.id === targetGrandparentCurrent.id
                )
                if (refGrandparentIsChild && targetGrandparentIsChild) {
                  commonAncestor = refGrandparentParent
                  break
                }
              }
            }

            refGrandparentCurrent = refGrandparentParent
            targetGrandparentCurrent = targetGrandparentParent
          }
        }
      }

      if (commonAncestor) {
        // This is a cousin ref where ref node is not a single child
        allCousinRefs.push({
          refNode,
          refNodeParent,
          targetNode,
          targetNodeParent,
          commonAncestor,
        })
      }
    }

    return allCousinRefs
  }

  const allCousinRefs = findAllNonSingleChildCousinRefs()

  // Group cousin refs by both the ref node's parent and target node's parent
  // We need to reorder siblings in both parents
  const cousinRefsByRefParent = new Map()
  const cousinRefsByTargetParent = new Map()

  for (const cousinRef of allCousinRefs) {
    const refParentId = cousinRef.refNodeParent.id
    const targetParentId = cousinRef.targetNodeParent.id

    if (!cousinRefsByRefParent.has(refParentId)) {
      cousinRefsByRefParent.set(refParentId, [])
    }
    cousinRefsByRefParent.get(refParentId).push(cousinRef)

    if (!cousinRefsByTargetParent.has(targetParentId)) {
      cousinRefsByTargetParent.set(targetParentId, [])
    }
    cousinRefsByTargetParent.get(targetParentId).push(cousinRef)
  }

  // First, reorder siblings in target node's parent: place target nodes last
  // This positions them to be closest to ref nodes (which will be first in their parent)
  cousinRefsByTargetParent.forEach((cousinRefs, parentId) => {
    const parent = nodeMap.get(parentId)
    if (!parent || !parent.children) return

    const targetNodes = new Set(cousinRefs.map((cr) => cr.targetNode.id))
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
    const reordered = [...otherSiblings, ...targetNodeList]

    // Update parent's children
    parent.children = reordered
  })

  // Then, reorder siblings in ref node's parent: place ref nodes first
  cousinRefsByRefParent.forEach((cousinRefs, parentId) => {
    const parent = nodeMap.get(parentId)
    if (!parent || !parent.children) return

    const refNodes = new Set(cousinRefs.map((cr) => cr.refNode.id))
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
    const reordered = [...refNodeList, ...otherSiblings]

    // Update parent's children
    parent.children = reordered

    // Convert refs to refChildren
    for (const cousinRef of cousinRefs) {
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
 * Convert sibling and SIMPLE cousin refs to refChildren structure
 *
 * This is a wrapper function that calls convertSiblingRefsInTree, convertCousinRefsInTree,
 * and convertNonSingleChildCousinRefsInTree in separate passes, as they handle different
 * types of refs and need to be processed separately.
 */
function convertSiblingAndCousinRefsToRefChildrenInTree(rootNode, eventName) {
  const skipCousinConversions = OPTIMIZATION_PASS_CONFIG.COUSIN_REF_BLACKLIST.includes(eventName)
  const skipComplexCousinConversions =
    OPTIMIZATION_PASS_CONFIG.COMPLEX_COUSIN_REF_BLACKLIST.includes(eventName)

  const siblingConversions = convertSiblingRefsInTree(rootNode)
  const cousinConversions = skipCousinConversions ? 0 : convertCousinRefsInTree(rootNode)
  const complexCousinConversions =
    skipCousinConversions || skipComplexCousinConversions
      ? 0
      : convertNonSingleChildCousinRefsInTree(rootNode)
  return siblingConversions + cousinConversions + complexCousinConversions
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
}
