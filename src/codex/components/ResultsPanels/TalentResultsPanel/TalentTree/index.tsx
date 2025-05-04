import { useEffect, useRef } from 'react'

import * as d3 from 'd3'

import { ParsedTalentData } from '../../../../types/talents'
import { createCx } from '../../../../../shared/utils/classnames'

import styles from './index.module.scss'

const cx = createCx(styles)

interface TalentTreeProps {
  talents: ParsedTalentData[]
}

interface TreeNode {
  name: string
  description: string
  children?: TreeNode[]
}

const TalentTree = ({ talents }: TalentTreeProps) => {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!svgRef.current || talents.length === 0) return

    // Clear previous visualization
    d3.select(svgRef.current).selectAll('*').remove()

    const buildTreeFromTalent = (talent: ParsedTalentData): TreeNode => {
      const children = talent.requiredForTalents.map(buildTreeFromTalent)
      return {
        name: talent.name,
        description: talent.description,
        children: children.length > 0 ? children : undefined,
      }
    }

    const buildTreeFromOtherRequirement = (requirement: string): TreeNode => {
      const children = talents
        .filter(
          (talent) =>
            talent.requiresEnergy.includes(requirement) ||
            talent.requiresClasses.includes(requirement)
        )
        .map(buildTreeFromTalent)

      return {
        name: requirement,
        description: '',
        children: children.length > 0 ? children : undefined,
      }
    }

    // Find all root talents (those with no requirements)
    const rootTalents = talents.filter(
      (talent) =>
        talent.requiresTalents.length === 0 &&
        talent.requiresEnergy.length === 0 &&
        talent.requiresClasses.length === 0
    )

    const rootEnergyRequirements = ['DEX', 'DEX2', 'INT', 'INT2', 'STR', 'STR2', 'STR3']
    const rootClassRequirements = [
      'Arcanist',
      'Hunter',
      'Knight',
      'Rogue',
      'Seeker',
      'Warrior',
      'Sunforge',
    ]

    const rootTalentsAndRequirements = [
      ...rootTalents.map(buildTreeFromTalent),
      ...rootEnergyRequirements.map(buildTreeFromOtherRequirement),
      ...rootClassRequirements.map(buildTreeFromOtherRequirement),
    ]

    // Create a virtual root node that connects all root talents
    const virtualRoot: TreeNode = {
      name: 'Root',
      description: '',
      children: rootTalentsAndRequirements,
    }

    // Create the hierarchy starting from the virtual root
    const root = d3.hierarchy(virtualRoot)

    // Set up the tree layout
    const treeLayout = d3.tree<TreeNode>().nodeSize([50, 150])

    const treeData = treeLayout(root)

    // Shift all nodes left so that the root talents are at y=0
    // (same as the virtual root node, which we are not rendering)
    // NB: Y is horizontal, X is vertical!
    const leftPadding = 10
    const offset =
      root.children && root.children.length > 0
        ? (root.children[0].y ?? 0) - leftPadding
        : -leftPadding
    treeData.each((node) => {
      node.y = node.y - offset
    })

    const allNodes = treeData.descendants()
    const minX = d3.min(allNodes, (d) => d.x) ?? 0
    const maxX = d3.max(allNodes, (d) => d.x) ?? 0
    const topPadding = 40
    const bottomPadding = 1500
    const svgHeight = maxX - minX + topPadding + bottomPadding

    console.log('minX', minX)
    console.log('maxX', maxX)
    console.log('svgHeight', svgHeight)

    const svg = d3
      .select(svgRef.current)
      .attr('width', 900)
      .attr('height', svgHeight)
      .append('g')
      .attr('transform', `translate(50, ${-minX + topPadding})`)

    // Link generator for drawing horizontal tree edges between nodes.
    // Expects objects with {source, target}, where each has .x (vertical) and .y (horizontal) coordinates.
    // The .x() and .y() accessors map these coordinates for the SVG path.
    // Used to visually connect parent and child nodes in the tree.
    const linkGenerator = d3
      .linkHorizontal<d3.HierarchyPointNode<TreeNode>, d3.HierarchyPointNode<TreeNode>>()
      .x((d) => d.y)
      .y((d) => d.x)

    // Add links between parent and child nodes
    svg
      .selectAll('.link')
      .data(treeData.links().filter((link) => link.source.depth > 0)) // Skip links from virtual root
      .enter()
      .append('path')
      .attr('class', cx('tree-link'))
      .attr('d', (d) => linkGenerator(d as unknown as d3.HierarchyPointNode<TreeNode>))

    // Add nodes
    const nodes = svg
      .selectAll('.node')
      .data(treeData.descendants().filter((d) => d.depth > 0)) // Skip virtual root node
      .enter()
      .append('g')
      .attr('class', cx('tree-node'))
      .attr('transform', (d) => `translate(${d.y ?? 0},${d.x ?? 0})`)

    // Add circles for nodes
    nodes.append('circle').attr('r', 10).attr('class', cx('tree-node-circle'))

    // Add text labels
    nodes
      .append('text')
      .attr('x', 0)
      .attr('y', -16)
      .attr('text-anchor', 'middle')
      .text((d) => d.data.name)
      .attr('class', cx('tree-node-text'))

    // Add tooltips
    nodes.append('title').text((d) => d.data.description)
  }, [talents])

  return (
    <div className={cx('talent-tree-container')}>
      <svg ref={svgRef} className={cx('talent-tree')} />
    </div>
  )
}

export default TalentTree
