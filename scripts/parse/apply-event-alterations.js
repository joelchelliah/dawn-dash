/**
 * Apply event alterations from event-alterations.json
 * Supports:
 * - Finding nodes by text or choiceLabel (find)
 * - Finding nodes by effect (findByEffect)
 * - Finding nodes by requirement (findByRequirement)
 * - Updating nodes (e.g., adding requirements)
 * - Adding new child nodes (addChild)
 * - Replacing entire nodes (replaceNode)
 * - Removing nodes from the tree (removeNode)
 */
function applyEventAlterations(rootNode, alterations, generateNodeId) {
  if (!rootNode || !alterations || alterations.length === 0) return 0

  let appliedCount = 0

  for (const alteration of alterations) {
    const {
      find,
      addRequirements,
      addChild,
      replaceNode,
      replaceChildren,
      modifyNode,
      removeNode,
    } = alteration

    // Validate that we have a find method
    if (!find) {
      console.warn(`  ⚠️  Alteration missing "find" field: ${JSON.stringify(alteration)}`)
      continue
    }

    // Find matching nodes recursively
    let matchingNodes = []
    let searchDescription = ''

    // Validate find is an object
    if (typeof find !== 'object' || find === null) {
      console.warn(`  ⚠️  Alteration "find" must be an object: ${JSON.stringify(alteration)}`)
      continue
    }

    // Find nodes based on criteria
    if (find.textStartsWith !== undefined) {
      matchingNodes = findNodesByTextStartsWith(rootNode, find.textStartsWith)
      searchDescription = `textStartsWith: "${find.textStartsWith}"`
    } else if (find.textOrLabel !== undefined) {
      const hasEffect = find.effect !== undefined
      if (hasEffect) {
        // Search by textOrLabel AND effect
        matchingNodes = findNodesByTextOrLabelAndEffect(rootNode, find.textOrLabel, find.effect)
        searchDescription = `textOrLabel: "${find.textOrLabel}" + effect: "${find.effect}"`
      } else {
        // Search by textOrLabel only
        matchingNodes = findNodesByTextOrChoiceLabel(rootNode, find.textOrLabel)
        searchDescription = `textOrLabel: "${find.textOrLabel}"`
      }
    } else if (find.effect !== undefined) {
      // Search by effect only
      matchingNodes = findNodesByEffect(rootNode, find.effect)
      searchDescription = `effect: "${find.effect}"`
    } else if (find.requirement !== undefined) {
      // Search by requirement only
      matchingNodes = findNodesByRequirement(rootNode, find.requirement)
      searchDescription = `requirement: "${find.requirement}"`
    } else {
      console.warn(`  ⚠️  Alteration has invalid find record: ${JSON.stringify(find)}`)
      continue
    }

    if (matchingNodes.length === 0) {
      console.warn(`  ⚠️  No nodes found matching: ${searchDescription}`)
      continue
    }

    // Remove node from tree
    if (removeNode) {
      for (const match of matchingNodes) {
        // Find and remove this node from its parent's children array
        const removed = removeNodeFromParent(rootNode, match.id)
        if (removed) {
          appliedCount++
        } else {
          console.warn(`  ⚠️  Failed to remove node ${match.id} from tree`)
        }
      }
      continue // Skip other operations if we're removing the node
    }

    // Replace entire node
    if (replaceNode) {
      for (const match of matchingNodes) {
        const refTargetMap = {}
        const refSourceNodes = []
        const refCreateNodes = []
        const newNode = createNodeFromAlterationSpec(
          replaceNode,
          refTargetMap,
          refSourceNodes,
          refCreateNodes,
          generateNodeId
        )
        if (newNode) {
          // Copy the old node's ID to preserve references
          newNode.id = match.id

          // Resolve refSource nodes to actual refs (within the alteration)
          for (const { node, refSource } of refSourceNodes) {
            const targetNodeId = refTargetMap[refSource]
            if (targetNodeId !== undefined) {
              node.ref = targetNodeId
            } else {
              console.warn(
                `  ⚠️  refSource ${refSource} not found in refTargetMap for alteration in node ${node.id}`
              )
            }
          }

          // Resolve refCreate nodes to actual refs (search the entire tree)
          for (const { node, refCreate } of refCreateNodes) {
            const candidates = findNodesByTextOrChoiceLabel(rootNode, refCreate)
            // Find the first candidate that doesn't have a ref (it's the original node)
            const targetNode = candidates.find((candidate) => candidate.ref === undefined)
            if (targetNode) {
              node.ref = targetNode.id
            } else {
              console.warn(
                `  ⚠️  refCreate "${refCreate}" did not find a matching node without a ref for node ${node.id}`
              )
            }
          }

          // Replace all properties of the matched node with the new node
          Object.keys(match).forEach((key) => delete match[key])
          Object.assign(match, newNode)
          appliedCount++
        }
      }
      continue // Skip other operations if we're replacing the node
    }

    // Replace children of matched nodes
    if (replaceChildren && Array.isArray(replaceChildren)) {
      for (const match of matchingNodes) {
        const refTargetMap = {}
        const refSourceNodes = []
        const refCreateNodes = []
        const newChildren = replaceChildren
          .map((spec) =>
            createNodeFromAlterationSpec(
              spec,
              refTargetMap,
              refSourceNodes,
              refCreateNodes,
              generateNodeId
            )
          )
          .filter((c) => c !== null)

        const firstWithChildren = newChildren.find((c) => c.children?.length)
        if (firstWithChildren) {
          const resultIds = firstWithChildren.children.map((c) => c.id)
          replaceChildren.forEach((spec, i) => {
            if (spec.refChildrenFromFirstSibling && newChildren[i]) {
              newChildren[i].refChildren = resultIds
            }
          })
        }

        for (const { node: n, refSource } of refSourceNodes) {
          const targetId = refTargetMap[refSource]
          if (targetId !== undefined) n.ref = targetId
        }
        for (const { node: n, refCreate } of refCreateNodes) {
          const candidates = findNodesByTextOrChoiceLabel(rootNode, refCreate)
          const target = candidates.find((c) => c.ref === undefined)
          if (target) n.ref = target.id
        }

        match.children = newChildren
        appliedCount++
      }
      continue
    }

    if (addRequirements) {
      // Filter out empty strings
      const newRequirements = addRequirements.filter((req) => req && typeof req === 'string')

      if (newRequirements.length > 0) {
        for (const node of matchingNodes) {
          // Merge with existing requirements, avoiding duplicates
          if (node.requirements) {
            const existingSet = new Set(node.requirements)
            newRequirements.forEach((req) => existingSet.add(req))
            node.requirements = Array.from(existingSet)
          } else {
            node.requirements = newRequirements
          }
          appliedCount++
        }
      }
    }

    // Modify node properties
    if (modifyNode) {
      for (const node of matchingNodes) {
        // Remove fields if specified with null
        if (modifyNode.removeRef && node.ref !== undefined) {
          delete node.ref
        }
        if (modifyNode.removeText && node.text !== undefined) {
          delete node.text
        }
        if (modifyNode.removeNumContinues && node.numContinues !== undefined) {
          delete node.numContinues
        }
        if (modifyNode.removeChildren && node.children !== undefined) {
          delete node.children
        }

        // Set new values
        if (modifyNode.type !== undefined) {
          node.type = modifyNode.type
        }

        // Handle refCreate: search the tree for a matching node and create a ref
        if (modifyNode.refCreate !== undefined) {
          const candidates = findNodesByTextOrChoiceLabel(rootNode, modifyNode.refCreate)
          const targetNode = candidates.find((candidate) => candidate.ref === undefined)
          if (targetNode) {
            node.ref = targetNode.id
          } else {
            console.warn(
              `  ⚠️  refCreate "${modifyNode.refCreate}" did not find a matching node without a ref for node ${node.id}`
            )
          }
        }

        // Handle refCreateStartsWith: ref to first node whose text/choiceLabel starts with the string
        if (modifyNode.refCreateStartsWith !== undefined) {
          const candidates = findNodesByTextStartsWith(rootNode, modifyNode.refCreateStartsWith)
          const targetNode = candidates.find((candidate) => candidate.ref === undefined)
          if (targetNode) {
            node.ref = targetNode.id
          } else {
            console.warn(
              `  ⚠️  refCreateStartsWith "${modifyNode.refCreateStartsWith}" did not find a matching node for node ${node.id}`
            )
          }
        }

        appliedCount++
      }
    }

    // Add children
    if (addChild) {
      for (const node of matchingNodes) {
        const refTargetMap = {}
        const refSourceNodes = []
        const refCreateNodes = []
        const newChild = createNodeFromAlterationSpec(
          addChild,
          refTargetMap,
          refSourceNodes,
          refCreateNodes,
          generateNodeId
        )
        if (newChild) {
          // Resolve refSource nodes to actual refs (within the alteration)
          for (const { node: childNode, refSource } of refSourceNodes) {
            const targetNodeId = refTargetMap[refSource]
            if (targetNodeId !== undefined) {
              childNode.ref = targetNodeId
            } else {
              console.warn(
                `  ⚠️  refSource ${refSource} not found in refTargetMap for alteration in node ${childNode.id}`
              )
            }
          }

          // Resolve refCreate nodes to actual refs (search the entire tree)
          for (const { node: childNode, refCreate } of refCreateNodes) {
            const candidates = findNodesByTextOrChoiceLabel(rootNode, refCreate)
            // Find the first candidate that doesn't have a ref (it's the original node)
            const targetNode = candidates.find((candidate) => candidate.ref === undefined)
            if (targetNode) {
              childNode.ref = targetNode.id
            } else {
              console.warn(
                `  ⚠️  refCreate "${refCreate}" did not find a matching node without a ref for node ${childNode.id}`
              )
            }
          }

          if (!node.children) {
            node.children = []
          }
          node.children.push(newChild)
          appliedCount++
        }
      }
    }
  }

  return appliedCount
}

/**
 * Remove a node from its parent's children array
 * Returns true if the node was found and removed, false otherwise
 */
function removeNodeFromParent(node, nodeIdToRemove) {
  if (!node || !node.children) return false

  // Check if any of this node's children match the ID to remove
  const childIndex = node.children.findIndex((child) => child.id === nodeIdToRemove)
  if (childIndex !== -1) {
    // Remove the child from the array
    node.children.splice(childIndex, 1)
    return true
  }

  // Recursively search in children
  for (const child of node.children) {
    if (removeNodeFromParent(child, nodeIdToRemove)) {
      return true
    }
  }

  return false
}

/**
 * Recursively find nodes matching text or choiceLabel
 */
function findNodesByTextOrChoiceLabel(node, searchText) {
  const matches = []

  if (!node) return matches

  // Check if this node matches
  if (
    (node.text && node.text.includes(searchText)) ||
    (node.choiceLabel && node.choiceLabel.includes(searchText))
  ) {
    matches.push(node)
  }

  // Recursively search children
  if (node.children) {
    for (const child of node.children) {
      matches.push(...findNodesByTextOrChoiceLabel(child, searchText))
    }
  }

  return matches
}

/**
 * Recursively find nodes where text or choiceLabel starts with the given string
 */
function findNodesByTextStartsWith(node, searchText) {
  const matches = []

  if (!node) return matches

  const textOrLabel = node.text || node.choiceLabel || ''
  if (textOrLabel.startsWith(searchText)) {
    matches.push(node)
  }

  if (node.children) {
    for (const child of node.children) {
      matches.push(...findNodesByTextStartsWith(child, searchText))
    }
  }

  return matches
}

/**
 * Recursively find nodes matching textOrLabel AND effect
 */
function findNodesByTextOrLabelAndEffect(node, searchText, searchEffect) {
  const matches = []

  if (!node) return matches

  // Check text or choiceLabel match
  const textOrLabelMatches =
    (node.text && node.text.includes(searchText)) ||
    (node.choiceLabel && node.choiceLabel.includes(searchText))

  // Check effect match
  const effectMatches =
    node.effects &&
    Array.isArray(node.effects) &&
    node.effects.some((effect) => effect.includes(searchEffect))

  if (textOrLabelMatches && effectMatches) {
    matches.push(node)
  }

  // Recursively search children
  if (node.children) {
    for (const child of node.children) {
      matches.push(...findNodesByTextOrLabelAndEffect(child, searchText, searchEffect))
    }
  }

  return matches
}

/**
 * Recursively find nodes that have a specific effect
 */
function findNodesByEffect(node, effectToFind) {
  const matches = []

  if (!node) return matches

  // Check if this node has the effect
  if (node.effects && Array.isArray(node.effects)) {
    for (const effect of node.effects) {
      if (effect.includes(effectToFind)) {
        matches.push(node)
        break // Only add the node once even if it has multiple matching effects
      }
    }
  }

  // Recursively search children
  if (node.children) {
    for (const child of node.children) {
      matches.push(...findNodesByEffect(child, effectToFind))
    }
  }

  return matches
}

/**
 * Recursively find nodes by requirement (substring match)
 */
function findNodesByRequirement(node, requirementToFind) {
  const matches = []

  if (!node) return matches

  // Check if this node has the requirement
  if (node.requirements && Array.isArray(node.requirements)) {
    for (const requirement of node.requirements) {
      if (requirement.includes(requirementToFind)) {
        matches.push(node)
        break // Only add the node once even if it has multiple matching requirements
      }
    }
  }

  // Recursively search children
  if (node.children) {
    for (const child of node.children) {
      matches.push(...findNodesByRequirement(child, requirementToFind))
    }
  }

  return matches
}

/**
 * Create a node from an alteration specification
 * Recursively creates children and assigns IDs
 *
 * Supports refTarget/refSource/refCreate for creating refs within alterations:
 * - refTarget: Marks a node as a ref target with a numeric ID
 * - refSource: Will be converted to ref: <node_id> pointing to the refTarget node
 * - refCreate: Will be converted to ref: <node_id> pointing to a node in the tree that matches
 *              the text/choiceLabel and has no ref of its own (the original node)
 *
 * @param {Object} spec - The node specification
 * @param {Object} refTargetMap - Map of refTarget numbers to actual node IDs
 * @param {Array} refSourceNodes - Array to collect nodes that need refSource resolution
 * @param {Array} refCreateNodes - Array to collect nodes that need refCreate resolution
 * @returns {Object} The created node
 */
function createNodeFromAlterationSpec(
  spec,
  refTargetMap = {},
  refSourceNodes = [],
  refCreateNodes = [],
  generateNodeId
) {
  if (!spec || !spec.type) {
    console.warn(`  ⚠️  Invalid node spec: missing type`)
    return null
  }

  const node = {
    id: generateNodeId(),
    type: spec.type,
  }

  if (spec.text !== undefined) {
    node.text = spec.text
  }

  if (spec.choiceLabel !== undefined) {
    node.choiceLabel = spec.choiceLabel
  }

  if (spec.speaker !== undefined) {
    node.speaker = spec.speaker
  }

  // Requirements are now just strings directly
  if (spec.requirements) {
    const normalized = spec.requirements.filter((req) => req && typeof req === 'string')
    if (normalized.length > 0) {
      node.requirements = normalized
    }
  }

  if (spec.effects) {
    node.effects = Array.isArray(spec.effects) ? spec.effects.filter((e) => e) : [spec.effects]
  }

  if (spec.numContinues !== undefined) {
    node.numContinues = spec.numContinues
  }

  if (spec.ref !== undefined) {
    // NOTE: This probably breaks very easily, if our tree building decides to assign
    // a different node id than our ref in the alteration spec is pointing to.
    node.ref = spec.ref
  }

  if (spec.refChildren !== undefined) {
    node.refChildren = Array.isArray(spec.refChildren) ? spec.refChildren : [spec.refChildren]
  }

  // Handle refTarget: mark this node as a target for refs
  if (spec.refTarget !== undefined) {
    refTargetMap[spec.refTarget] = node.id
  }

  // Handle refSource: mark this node for later ref resolution
  if (spec.refSource !== undefined) {
    refSourceNodes.push({ node, refSource: spec.refSource })
  }

  // Handle refCreate: mark this node for later ref resolution by searching the tree
  if (spec.refCreate !== undefined) {
    refCreateNodes.push({ node, refCreate: spec.refCreate })
  }

  // Recursively create children
  if (spec.children && Array.isArray(spec.children)) {
    node.children = spec.children
      .map((childSpec) =>
        createNodeFromAlterationSpec(
          childSpec,
          refTargetMap,
          refSourceNodes,
          refCreateNodes,
          generateNodeId
        )
      )
      .filter((child) => child !== null)
  }

  return node
}

module.exports = { applyEventAlterations }
