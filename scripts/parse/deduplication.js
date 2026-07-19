/**
 * Structural subtree deduplication (post-processing).
 *
 * Replaces structurally identical subtrees with refs, preferring shallow originals.
 * Runs AFTER the semantic hub-optimization passes so dialogue-menu patterns are
 * handled semantically first, then structural dedup cleans up remaining duplicates.
 *
 * Two subtrees are duplicates when they RENDER the same, i.e. they are equal modulo ref
 * resolution: a ref node stands for its target, so a subtree containing "ref → X" is a
 * duplicate of one that expands X's content at the corresponding position (build-time loop
 * detection routinely produces one expanded copy and one made of refs into it). Equality
 * is decided by `nodesEquivalent`: a cycle-safe, ref-resolving structural comparison
 * (graph bisimulation), accelerated by exact bottom-up subtree hashing — identical
 * subtrees short-circuit on their interned hash without any recursion.
 *
 * This replaces the old depth-limited signature comparison, which could falsely merge
 * subtrees that genuinely differed below the signature depth (it never looked deeper).
 *
 * The duplicate's own requirements/effects/numContinues may differ from the original's: a
 * merge only deletes the duplicate's children (the ref node keeps and renders its own
 * fields), and e.g. requirements are path-dependent — two copies of the same shared future
 * can legitimately be gated differently. Descendants get no such slack, since they're
 * deleted and represented by the original's subtree.
 */
const { OPTIMIZATION_PASS_CONFIG, RANDOM_KEYWORD } = require('./configs.js')

/**
 * Compute per node, bottom-up in one traversal:
 * - canonicalId: interned id of the FULL subtree (all own fields + children's canonical
 *   ids). Equal canonicalId ⇔ recursively identical subtrees, no collision risk.
 * - size: subtree node count.
 * Returns a Map from node object to { canonicalId, size }.
 */
function computeCanonicalSubtreeIds(rootNode) {
  const internTable = new Map() // canonical key -> small int
  const infoByNode = new Map() // node -> { canonicalId, size }

  function visit(node) {
    const childIds = []
    let size = 1
    if (node.children) {
      for (const child of node.children) {
        const childInfo = visit(child)
        childIds.push(childInfo.canonicalId)
        size += childInfo.size
      }
    }

    // NOTE: ref can be 0 and ?? preserves it (only null/undefined become null).
    const key = JSON.stringify([
      node.text ?? null,
      node.choiceLabel ?? null,
      node.type ?? null,
      node.requirements ?? null,
      node.effects ?? null,
      node.numContinues ?? null,
      node.ref ?? null,
      node.refChildren ?? null,
      childIds,
    ])

    let canonicalId = internTable.get(key)
    if (canonicalId === undefined) {
      canonicalId = internTable.size
      internTable.set(key, canonicalId)
    }

    const info = { canonicalId, size }
    infoByNode.set(node, info)
    return info
  }

  visit(rootNode)
  return infoByNode
}

/**
 * Deduplicate structurally identical subtrees within a single event tree
 *
 * Uses breadth-first traversal to process nodes from shallowest to deepest.
 * This ensures the shallowest occurrence becomes the original (better for visualization).
 *
 * Only deduplicates subtrees with at least DEDUPLICATE_SUBTREES_MIN_SUBTREE_SIZE nodes.
 * Duplicate subtrees are replaced with ref nodes pointing to the first occurrence.
 */
function deduplicateEventTree(rootNode) {
  let duplicatesFound = 0
  let nodesRemoved = 0

  // Breadth-first traversal to process nodes from shallowest to deepest
  const queue = [rootNode]
  const allNodes = []
  const nodeById = new Map()

  while (queue.length > 0) {
    const node = queue.shift()
    if (!node) continue
    allNodes.push(node)
    if (node.id !== undefined) {
      nodeById.set(node.id, node)
    }
    if (node.children) {
      queue.push(...node.children)
    }
  }

  // Narrow safety guard:
  // Avoid deduping a subtree if doing so would prune away a node that is referenced by a ref
  // from OUTSIDE that subtree. (Refs from inside the subtree would be deleted too, so they
  // don't count as "must stay reachable" for this specific prune.)
  //
  // This is much less invasive than "protect all ancestors of all ref targets" and avoids
  // broad side effects in other events.
  const referrersByTargetId = new Map() // targetId -> Array<referrerId>
  for (const node of allNodes) {
    if (node?.id !== undefined && node.ref !== undefined) {
      const arr = referrersByTargetId.get(node.ref) || []
      arr.push(node.id)
      referrersByTargetId.set(node.ref, arr)
    }
  }

  // Precompute subtree membership via DFS entry/exit times.
  const tin = new Map()
  const tout = new Map()
  let time = 0
  const stack = [{ node: rootNode, state: 0 }]
  while (stack.length > 0) {
    const top = stack.pop()
    const node = top.node
    if (!node || node.id === undefined) continue
    if (top.state === 0) {
      tin.set(node.id, time++)
      stack.push({ node, state: 1 })
      const children = node.children || []
      for (let i = children.length - 1; i >= 0; i--) {
        stack.push({ node: children[i], state: 0 })
      }
    } else {
      tout.set(node.id, time - 1)
    }
  }

  const refTargetsSortedByTin = Array.from(referrersByTargetId.keys())
    .filter((id) => tin.has(id))
    .sort((a, b) => tin.get(a) - tin.get(b))

  function lowerBoundTargetsByTin(minTin) {
    let lo = 0
    let hi = refTargetsSortedByTin.length
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      const id = refTargetsSortedByTin[mid]
      if (tin.get(id) < minTin) lo = mid + 1
      else hi = mid
    }
    return lo
  }

  function subtreeWouldPruneExternalRefTarget(candidateNode) {
    const candId = candidateNode.id
    const start = tin.get(candId)
    const end = tout.get(candId)
    if (start === undefined || end === undefined) return false

    const startIdx = lowerBoundTargetsByTin(start)
    for (let i = startIdx; i < refTargetsSortedByTin.length; i++) {
      const targetId = refTargetsSortedByTin[i]
      const tTin = tin.get(targetId)
      if (tTin === undefined || tTin > end) break

      // targetId is inside candidate subtree. If any referrer is outside, pruning breaks it.
      const referrers = referrersByTargetId.get(targetId) || []
      for (const referrerId of referrers) {
        const rTin = tin.get(referrerId)
        if (rTin === undefined) continue
        if (rTin < start || rTin > end) {
          return true
        }
      }
    }

    return false
  }

  const infoByNode = computeCanonicalSubtreeIds(rootNode)

  /**
   * Where does the flow continue after `node`, for rendering-equivalence purposes?
   * - No ref: its children.
   * - Self-copy ref (node duplicates its target's text/type, i.e. it stands for the
   *   target node itself): the target's children.
   * - Continuation ref (e.g. a choice looping back to an earlier node): the target node.
   * Returns null for a dangling ref (target id not in this tree).
   */
  function resolvedNext(node) {
    if (node.ref === undefined) return node.children || []
    const target = nodeById.get(node.ref)
    if (!target) return null
    if (target.text === node.text && target.type === node.type) return target.children || []
    return [target]
  }

  /**
   * Cycle-safe rendering equivalence of two subtrees (graph bisimulation): refs are
   * resolved to their targets, so a ref stub is equivalent to the expansion it points at.
   * `seen` memoizes visited (b, a) pairs; on revisiting a pair (a ref cycle) the pair is
   * assumed equivalent — the standard coinductive rule for comparing cyclic structures,
   * sound because children are compared positionally.
   *
   * The candidate root's own requirements/effects/numContinues are exempt (they survive
   * on the ref node); every deeper node must match on all fields.
   */
  function nodesEquivalent(b, a, isRoot, seen) {
    if (b === a) return true
    const bInfo = infoByNode.get(b)
    const aInfo = infoByNode.get(a)
    if (bInfo && aInfo && bInfo.canonicalId === aInfo.canonicalId) return true

    if ((b.text ?? null) !== (a.text ?? null)) return false
    if ((b.choiceLabel ?? null) !== (a.choiceLabel ?? null)) return false
    if ((b.type ?? null) !== (a.type ?? null)) return false
    if (!isRoot) {
      if (JSON.stringify(b.requirements ?? null) !== JSON.stringify(a.requirements ?? null))
        return false
      if (JSON.stringify(b.effects ?? null) !== JSON.stringify(a.effects ?? null)) return false
      if ((b.numContinues ?? null) !== (a.numContinues ?? null)) return false
      if (JSON.stringify(b.refChildren ?? null) !== JSON.stringify(a.refChildren ?? null))
        return false
    }

    // NOTE: ref can be 0, so don't use truthy checks here.
    if (b.ref !== undefined && a.ref !== undefined && b.ref === a.ref) return true

    const pairKey = `${b.id}|${a.id}`
    if (seen.has(pairKey)) return true
    seen.add(pairKey)

    const bNext = resolvedNext(b)
    const aNext = resolvedNext(a)
    if (!bNext || !aNext) return false
    if (bNext.length !== aNext.length) return false
    for (let i = 0; i < bNext.length; i++) {
      if (!nodesEquivalent(bNext[i], aNext[i], false, seen)) return false
    }
    return true
  }

  // Candidate originals grouped by the root fields that must match exactly; within a
  // group, equivalence against each recorded original is decided by nodesEquivalent.
  const originalsByGroupKey = new Map() // "text|choiceLabel|type" JSON -> Array<node>
  const removedNodeIds = new Set() // nodes pruned by a dedup earlier in this pass

  // Process nodes in breadth-first order (shallowest first). Originals are always at the
  // same depth or shallower than their duplicates, so a recorded original can never sit
  // inside a later candidate's subtree — refs created here can't dangle within this pass.
  for (const node of allNodes) {
    if (removedNodeIds.has(node.id)) continue // inside an already-pruned subtree
    if (!node.children || node.children.length === 0) continue
    // NOTE: ref can be 0, so don't use truthy checks here.
    if (node.ref !== undefined) continue // Skip nodes that are already references

    const { size } = infoByNode.get(node)

    // Check if this subtree is large enough to deduplicate
    if (size < OPTIMIZATION_PASS_CONFIG.DEDUPLICATE_SUBTREES_MIN_SUBTREE_SIZE) continue

    const groupKey = JSON.stringify([
      node.text ?? null,
      node.choiceLabel ?? null,
      node.type ?? null,
    ])
    let group = originalsByGroupKey.get(groupKey)
    if (!group) {
      group = []
      originalsByGroupKey.set(groupKey, group)
    }

    let originalNode = null
    // Don't collapse nodes whose text contains RANDOM_KEYWORD (distinct branches that only differ by the random value)
    const mergeAllowed = !(node.text && node.text.includes(RANDOM_KEYWORD))
    if (mergeAllowed) {
      originalNode = group.find((candidate) => nodesEquivalent(node, candidate, true, new Set()))
    }
    if (!originalNode) {
      // First occurrence of this subtree - store it
      group.push(node)
      continue
    }

    // Don't prune away externally-referenced ref targets.
    if (subtreeWouldPruneExternalRefTarget(node)) {
      continue
    }

    // Mark the pruned descendants so they're skipped for the rest of this pass
    const pruneStack = [...node.children]
    while (pruneStack.length > 0) {
      const pruned = pruneStack.pop()
      if (!pruned) continue
      removedNodeIds.add(pruned.id)
      if (pruned.children) {
        pruneStack.push(...pruned.children)
      }
    }

    // Mark this node as a reference to the original
    node.ref = originalNode.id
    delete node.children
    nodesRemoved += size - 1 // -1 because we keep the reference node
    duplicatesFound++
  }

  return { duplicatesFound, nodesRemoved }
}

/**
 * Post-processing: Deduplicate structurally identical subtrees across all event trees
 * This catches remaining duplicates that weren't detected during tree building
 *
 * Exact hashing catches nearly everything in one pass (parents of identical children hash
 * identically, so cascades collapse top-down immediately). A repeat pass can still find
 * more: collapsing a duplicate into a ref can make its ancestor identical to a subtree
 * that already contained an equivalent ref before the pass. So we loop until a pass
 * removes nothing; each earlier pass removes at least one node, so this terminates.
 */
function deduplicateAllTrees(eventTrees) {
  let totalDuplicates = 0
  let totalNodesRemoved = 0
  let passesRun = 0

  // Track (aggregate) which events were deduped across all passes.
  const eventStats = new Map() // name -> { duplicates, nodesRemoved }

  while (true) {
    let nodesRemovedThisPass = 0

    eventTrees.forEach((tree) => {
      if (!tree.rootNode) return

      const { duplicatesFound, nodesRemoved } = deduplicateEventTree(tree.rootNode)
      if (duplicatesFound <= 0) return

      totalDuplicates += duplicatesFound
      totalNodesRemoved += nodesRemoved
      nodesRemovedThisPass += nodesRemoved

      const prev = eventStats.get(tree.name) || { duplicates: 0, nodesRemoved: 0 }
      prev.duplicates += duplicatesFound
      prev.nodesRemoved += nodesRemoved
      eventStats.set(tree.name, prev)
    })

    passesRun++
    if (nodesRemovedThisPass === 0) break
  }

  const eventsWithDedupe = Array.from(eventStats.entries()).map(([name, stats]) => ({
    name,
    duplicates: stats.duplicates,
    nodesRemoved: stats.nodesRemoved,
  }))

  return { totalDuplicates, totalNodesRemoved, eventsWithDedupe, passesRun }
}

module.exports = {
  deduplicateAllTrees,
}
