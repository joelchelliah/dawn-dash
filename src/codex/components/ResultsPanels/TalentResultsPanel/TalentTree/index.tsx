import { useEffect, useRef } from 'react'

import * as d3 from 'd3'

import { createCx } from '@/shared/utils/classnames'
import {
  DexImageUrl,
  IntImageUrl,
  StrImageUrl,
  NeutralImageUrl,
  ArcanistImageUrl,
  HunterImageUrl,
  KnightImageUrl,
  RogueImageUrl,
  SeekerImageUrl,
  WarriorImageUrl,
  SunforgeImageUrl,
} from '@/shared/utils/imageUrls'

import {
  TalentTreeRequirementNode,
  TalentTreeTalentNode,
  TalentTree as TalentTreeType,
  TalentTreeNodeType,
} from '@/codex/types/talents'

import styles from './index.module.scss'

const cx = createCx(styles)

interface TalentTreeProps {
  talentTree: TalentTreeType | undefined
}

interface TreeNode {
  name: string
  description: string
  nodeType?: TalentTreeNodeType
  children?: TreeNode[]
}

const getRequirementIconUrl = (
  isClassRequirement: boolean,
  name: string
): { count: number; url: string } => {
  if (isClassRequirement) {
    switch (name) {
      case 'Arcanist':
        return { count: 1, url: ArcanistImageUrl }
      case 'Hunter':
        return { count: 1, url: HunterImageUrl }
      case 'Knight':
        return { count: 1, url: KnightImageUrl }
      case 'Rogue':
        return { count: 1, url: RogueImageUrl }
      case 'Seeker':
        return { count: 1, url: SeekerImageUrl }
      case 'Warrior':
        return { count: 1, url: WarriorImageUrl }
      default:
        return { count: 1, url: SunforgeImageUrl }
    }
  }

  switch (name) {
    case 'DEX':
      return { count: 1, url: DexImageUrl }
    case 'DEX2':
      return { count: 2, url: DexImageUrl }
    case 'INT':
      return { count: 1, url: IntImageUrl }
    case 'INT2':
      return { count: 2, url: IntImageUrl }
    case 'STR':
      return { count: 1, url: StrImageUrl }
    case 'STR2':
      return { count: 2, url: StrImageUrl }
    case 'STR3':
      return { count: 3, url: StrImageUrl }
    default:
      return { count: 1, url: NeutralImageUrl }
  }
}

const TalentTree = ({ talentTree }: TalentTreeProps) => {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!svgRef.current || !talentTree) return

    // Clear previous visualization
    d3.select(svgRef.current).selectAll('*').remove()

    const buildTreeFromTalent = (node: TalentTreeTalentNode): TreeNode => {
      const children = node.children.map(buildTreeFromTalent)
      return {
        name: node.name,
        description: node.description,
        nodeType: TalentTreeNodeType.TALENT,
        children: children.length > 0 ? children : undefined,
      }
    }

    const buildTreeFromOtherRequirement = (node: TalentTreeRequirementNode): TreeNode => {
      const children = node.children.map(buildTreeFromTalent)

      return {
        name: node.name,
        description: `TODO description for ${node.name}`,
        nodeType: node.type,
        children: children.length > 0 ? children : undefined,
      }
    }

    const treeNode = d3.hierarchy<TreeNode>({
      name: 'Root',
      description: '',
      children: [
        buildTreeFromOtherRequirement(talentTree.noReqNode),
        ...talentTree.energyNodes.map(buildTreeFromOtherRequirement),
        ...talentTree.classNodes.map(buildTreeFromOtherRequirement),
      ],
    })

    // Node dimensions
    const nodeWidth = 200
    const nodeHeight = 80
    const nameHeight = 25
    const descriptionHeight = 55
    const horizontalSpacing = nodeWidth * 1.4
    const verticalSpacing = nodeHeight * 1.4

    const treeLayout = d3.tree<TreeNode>().nodeSize([verticalSpacing, horizontalSpacing])
    const treeData = treeLayout(treeNode)

    // Shift all nodes left so that the root talents are at y=0
    // (same as the virtual root node, which we are not rendering)
    // NB: Y is horizontal, X is vertical!
    // TODO: This needs some work to make it look good!
    const leftPadding = nodeWidth * 0.25
    const offset =
      treeNode.children && treeNode.children.length > 0
        ? (treeNode.children[0].y ?? 0) - leftPadding
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
      .data(treeData.descendants().filter(({ depth }) => depth > 0)) // Skip virtual root node
      .enter()
      .append('g')
      .attr('class', cx('tree-node'))
      .attr('transform', ({ y, x }) => `translate(${y ?? 0},${x ?? 0})`)

    // Create defs element for clipPaths
    const defs = svg.append('defs')

    // Render nodes based on depth
    nodes.each(function ({ depth, data }, _index) {
      const nodeElement = d3.select(this)

      if (depth === 1) {
        if (data.nodeType) {
          const isClassRequirement = data.nodeType === TalentTreeNodeType.CLASS_REQUIREMENT
          const { count, url } = getRequirementIconUrl(isClassRequirement, data.name)

          let circleRadius = 0
          if (isClassRequirement) {
            circleRadius = 23
          } else if (count === 1) {
            circleRadius = 13
          } else if (count === 2) {
            circleRadius = 17
          } else if (count === 3) {
            circleRadius = 26
          }

          nodeElement.append('circle').attr('r', circleRadius).attr('class', cx('tree-node-circle'))

          if (count > 0) {
            const iconSize = isClassRequirement ? 42 : 22
            const spacing = 2
            const totalWidth = count * iconSize + (count - 1) * spacing
            const startX = -totalWidth / 2

            for (let i = 0; i < count; i++) {
              const x = startX + i * (iconSize + spacing)

              if (count === 1) {
                // Single icon - apply circular clipping
                const clipId = `circle-clip-${_index}-${i}`

                defs
                  .append('clipPath')
                  .attr('id', clipId)
                  .append('circle')
                  .attr('r', iconSize / 2)
                  .attr('cx', x + iconSize / 2)
                  .attr('cy', -iconSize / 2 + iconSize / 2)

                nodeElement
                  .append('image')
                  .attr('href', url)
                  .attr('x', x)
                  .attr('y', -iconSize / 2)
                  .attr('width', iconSize)
                  .attr('height', iconSize)
                  .attr('clip-path', `url(#${clipId})`)
              } else {
                // Multiple icons - no clipping, place them next to each other
                nodeElement
                  .append('image')
                  .attr('href', url)
                  .attr('x', x)
                  .attr('y', -iconSize / 2)
                  .attr('width', iconSize)
                  .attr('height', iconSize)
              }
            }
          }
        }
      } else {
        // Rectangular nodes with text for depth > 1 (talent nodes)
        // Add rectangular boxes for nodes
        nodeElement
          .append('rect')
          .attr('width', nodeWidth)
          .attr('height', nodeHeight)
          .attr('x', -nodeWidth / 2)
          .attr('y', -nodeHeight / 2)
          .attr('class', cx('tree-node-rect'))

        // Add separator line
        nodeElement
          .append('line')
          .attr('x1', -nodeWidth / 2)
          .attr('y1', -nodeHeight / 2 + nameHeight)
          .attr('x2', nodeWidth / 2)
          .attr('y2', -nodeHeight / 2 + nameHeight)
          .attr('class', cx('tree-node-separator'))

        // Add content group
        const contentGroup = nodeElement.append('g').attr('class', cx('tree-node-content'))

        // Helper function to wrap text
        const wrapText = (text: string, width: number, fontSize: number) => {
          const words = text.split(' ')
          const lines: string[] = []
          let currentLine = words[0]

          for (let i = 1; i < words.length; i++) {
            const word = words[i]
            const testLine = currentLine + ' ' + word
            const testWidth = testLine.length * fontSize * 0.6 // Approximate character width

            if (testWidth > width) {
              lines.push(currentLine)
              currentLine = word
            } else {
              currentLine = testLine
            }
          }
          lines.push(currentLine)
          return lines
        }

        // Add name text with wrapping
        const nameGroup = contentGroup
          .append('g')
          .attr('transform', `translate(0, ${-nodeHeight / 2 + nameHeight / 2})`)

        const nameLines = wrapText(data.name, nodeWidth - 10, 10) // 10px font size
        const nameLineHeight = 12

        nameLines.forEach((line, i) => {
          nameGroup
            .append('text')
            .attr('x', 0)
            .attr('y', i * nameLineHeight - ((nameLines.length - 1) * nameLineHeight) / 2)
            .text(line)
            .attr('class', cx('tree-node-name'))
        })

        // Add description text with wrapping
        const descGroup = contentGroup
          .append('g')
          .attr(
            'transform',
            `translate(0, ${-nodeHeight / 2 + nameHeight + descriptionHeight / 2})`
          )

        const descLines = wrapText(data.description, nodeWidth - 10, 8) // 8px font size
        const descLineHeight = 10

        descLines.forEach((line, i) => {
          descGroup
            .append('text')
            .attr('x', 0)
            .attr('y', i * descLineHeight - ((descLines.length - 1) * descLineHeight) / 2)
            .text(line)
            .attr('class', cx('tree-node-description'))
        })
      }
    })
  }, [talentTree])

  return (
    <div className={cx('talent-tree-container')}>
      <svg ref={svgRef} className={cx('talent-tree')} />
    </div>
  )
}

export default TalentTree
