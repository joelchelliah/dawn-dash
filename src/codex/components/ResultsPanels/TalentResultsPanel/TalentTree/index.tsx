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
  DanceOfBlightImageUrl,
  RushedForgeryImageUrl,
} from '@/shared/utils/imageUrls'
import { ClassColorVariant, darken, getClassColor, lighten } from '@/shared/utils/classColors'
import { CharacterClass } from '@/shared/types/characterClass'

import {
  TalentTree as TalentTreeType,
  TalentTreeNodeType,
  HierarchicalTalentTreeNode,
} from '@/codex/types/talents'
import { parseTalentDescriptionLine } from '@/codex/utils/talentHelper'
import { buildHierarchicalTreeFromTalentTree } from '@/codex/utils/treeHelper'

import styles from './index.module.scss'

const cx = createCx(styles)

interface TalentTreeProps {
  talentTree: TalentTreeType | undefined
}

const getRequirementIconProps = (
  isClassRequirement: boolean,
  label: string
): { count: number; url: string; color: string; label: string } => {
  if (isClassRequirement) {
    const color = getClassColor(label as CharacterClass, ClassColorVariant.Dark)
    switch (label) {
      case CharacterClass.Arcanist:
        return { count: 1, url: ArcanistImageUrl, color, label }
      case CharacterClass.Hunter:
        return { count: 1, url: HunterImageUrl, color, label }
      case CharacterClass.Knight:
        return { count: 1, url: KnightImageUrl, color, label }
      case CharacterClass.Rogue:
        return { count: 1, url: RogueImageUrl, color, label }
      case CharacterClass.Seeker:
        return { count: 1, url: SeekerImageUrl, color, label }
      case CharacterClass.Warrior:
        return { count: 1, url: WarriorImageUrl, color, label }
      default:
        return { count: 1, url: SunforgeImageUrl, color, label }
    }
  }

  const colorGrey = getClassColor(CharacterClass.Neutral, ClassColorVariant.Default)
  const colorRed = getClassColor(CharacterClass.Warrior, ClassColorVariant.Default)
  const colorGreen = getClassColor(CharacterClass.Rogue, ClassColorVariant.Default)
  const colorBlue = getClassColor(CharacterClass.Arcanist, ClassColorVariant.Default)

  switch (label) {
    case 'DEX':
      return { count: 1, url: DexImageUrl, color: colorGreen, label: 'DEX' }
    case 'DEX2':
      return { count: 2, url: DexImageUrl, color: colorGreen, label: '2 DEX' }
    case 'INT':
      return { count: 1, url: IntImageUrl, color: colorBlue, label: 'INT' }
    case 'INT2':
      return { count: 2, url: IntImageUrl, color: colorBlue, label: '2 INT' }
    case 'STR':
      return { count: 1, url: StrImageUrl, color: colorRed, label: 'STR' }
    case 'STR2':
      return { count: 2, url: StrImageUrl, color: colorRed, label: '2 STR' }
    case 'STR3':
      return { count: 3, url: StrImageUrl, color: colorRed, label: '3 STR' }
    case 'Offers':
      return { count: 1, url: DanceOfBlightImageUrl, color: darken(colorRed, 10), label: 'Offers' }
    case 'Events':
      return { count: 1, url: RushedForgeryImageUrl, color: colorGrey, label: 'Events' }
    case 'No Requirements':
      return { count: 1, url: NeutralImageUrl, color: colorGrey, label: 'No requirements' }
    default:
      throw new Error(`Unknown requirement label: ${label}`)
  }
}

const TalentTree = ({ talentTree }: TalentTreeProps) => {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!svgRef.current || !talentTree) return

    // Clear previous visualization
    d3.select(svgRef.current).selectAll('*').remove()

    const treeNode = d3.hierarchy<HierarchicalTalentTreeNode>(
      buildHierarchicalTreeFromTalentTree(talentTree)
    )

    // - - - - - Node dimensions - - - - -
    const nodeWidth = 200
    const nameHeight = 25
    const baseDescriptionHeight = 20
    const descriptionLineHeight = 11
    const defaultVerticalSpacing = 100
    const horizontalSpacing = nodeWidth * 1.4
    // - - - - - - - - - - - - - - - - - -

    const wrapText = (text: string, width: number, fontSize: number) => {
      const approxCharacterWidth = fontSize * 0.61
      const words = text.split(' ')
      const lines: string[] = [''] // Start with an empty line for slight padding
      let currentLine = words[0]

      const stripHtmlTags = (str: string) => str.replace(/<\/?(?:b|nobr)>/gi, '')

      for (let i = 1; i < words.length; i++) {
        const word = words[i]
        const testLine = currentLine + ' ' + word
        const testWidth = stripHtmlTags(testLine).length * approxCharacterWidth

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

    const getDynamicVerticalSpacing = (node: HierarchicalTalentTreeNode) => {
      if (node.type === TalentTreeNodeType.TALENT) {
        const descLines = wrapText(node.description, nodeWidth + 10, 10)
        const descriptionHeight = Math.max(
          baseDescriptionHeight,
          descLines.length * descriptionLineHeight
        )

        return (nameHeight + descriptionHeight) * 1.7
      }
      return defaultVerticalSpacing
    }

    const treeLayout = d3
      .tree<HierarchicalTalentTreeNode>()
      .nodeSize([defaultVerticalSpacing, horizontalSpacing])
      .separation((a, b) => {
        const aVertical = getDynamicVerticalSpacing(a.data)
        const bVertical = getDynamicVerticalSpacing(b.data)
        const minSeparation = (aVertical + bVertical) / (2 * defaultVerticalSpacing)

        return a.parent === b.parent ? minSeparation : minSeparation * 1.25
      })
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
    const maxDepth = d3.max(allNodes, (d) => d.depth) ?? 0

    const topPadding = 40
    const bottomPadding = 1500
    const minFactorForEverythingToFitInContainer = 0.925
    const svgHeight =
      minFactorForEverythingToFitInContainer * maxX - minX + topPadding + bottomPadding

    // Calculate width based on max depth
    const baseWidth = 1050 // Width for depth 4
    const svgWidth = Math.max(400, (maxDepth / 4) * baseWidth) // Minimum 400px, scale with depth

    const mainSvg = d3
      .select(svgRef.current)
      .attr('viewBox', `0 -10 ${svgWidth} ${svgHeight}`)
      .attr('width', svgWidth)
      .attr('height', svgHeight)

    // Define icons in defs on the main SVG
    const defs = mainSvg.append('defs')

    // Add icon definitions
    const icons = [
      { id: 'health-icon', url: 'https://blightbane.io/images/health.webp' },
      { id: 'holy-icon', url: 'https://blightbane.io/images/holy.webp' },
      { id: 'str-icon', url: 'https://blightbane.io/images/str.webp' },
      { id: 'int-icon', url: 'https://blightbane.io/images/int.webp' },
      { id: 'dex-icon', url: 'https://blightbane.io/images/dex.webp' },
    ]

    icons.forEach(({ id, url }) => {
      defs.append('image').attr('id', id).attr('href', url).attr('width', 12).attr('height', 12)
    })

    const svg = mainSvg.append('g').attr('transform', `translate(50, ${-minX + topPadding})`)

    // Link generator for drawing horizontal tree edges between nodes.
    // Expects objects with {source, target}, where each has .x (vertical) and .y (horizontal) coordinates.
    // The .x() and .y() accessors map these coordinates for the SVG path.
    // Used to visually connect parent and child nodes in the tree.
    const linkGenerator = d3
      .linkHorizontal<
        d3.HierarchyPointNode<HierarchicalTalentTreeNode>,
        d3.HierarchyPointNode<HierarchicalTalentTreeNode>
      >()
      .x((d) => d.y)
      .y((d) => d.x)

    // Add links between parent and child nodes
    svg
      .selectAll('.link')
      .data(treeData.links().filter((link) => link.source.depth > 0)) // Skip links from virtual root
      .enter()
      .append('path')
      .attr('class', cx('tree-link'))
      .attr('d', (d) =>
        linkGenerator(d as unknown as d3.HierarchyPointNode<HierarchicalTalentTreeNode>)
      )
      .style('stroke', (link) => {
        const parentData = link.source.data

        const getLinkColor = (name: string, type: TalentTreeNodeType | undefined): string => {
          const colorGrey = darken(
            getClassColor(CharacterClass.Neutral, ClassColorVariant.Darkest),
            15
          )

          if (type === TalentTreeNodeType.CLASS_REQUIREMENT) {
            return getClassColor(name as CharacterClass, ClassColorVariant.Dark)
          } else if (type === TalentTreeNodeType.ENERGY_REQUIREMENT) {
            const colorRed = getClassColor(CharacterClass.Warrior, ClassColorVariant.Dark)
            const colorGreen = getClassColor(CharacterClass.Rogue, ClassColorVariant.Dark)
            const colorBlue = getClassColor(CharacterClass.Arcanist, ClassColorVariant.Dark)

            switch (name) {
              case 'DEX':
              case 'DEX2':
                return colorGreen
              case 'INT':
              case 'INT2':
                return colorBlue
              case 'STR':
              case 'STR2':
              case 'STR3':
                return colorRed
              default:
                return colorGrey
            }
          } else if (type === TalentTreeNodeType.TALENT) {
            let currentNode = link.source
            while (currentNode.parent && currentNode.data.type === TalentTreeNodeType.TALENT) {
              currentNode = currentNode.parent
            }
            return getLinkColor(currentNode.data.name, currentNode.data.type)
          }
          return colorGrey
        }

        return getLinkColor(parentData.name, parentData.type)
      })

    // Add nodes
    const nodes = svg
      .selectAll('.node')
      .data(treeData.descendants().filter(({ depth }) => depth > 0)) // Skip virtual root node
      .enter()
      .append('g')
      .attr('class', cx('tree-node'))
      .attr('transform', ({ y, x }) => `translate(${y ?? 0},${x ?? 0})`)

    // Add filter for talent node glow effect
    defs
      .append('filter')
      .attr('id', 'talent-glow')
      .append('feGaussianBlur')
      .attr('stdDeviation', '8')
      .attr('result', 'coloredBlur')

    defs.select('#talent-glow').append('feMerge').append('feMergeNode').attr('in', 'coloredBlur')

    defs.select('#talent-glow').append('feMerge').append('feMergeNode').attr('in', 'SourceGraphic')

    // Render nodes based on depth
    nodes.each(function ({ depth, data }, _index) {
      const nodeElement = d3.select(this)

      if (depth === 1) {
        if (data.type) {
          const isClassRequirement = data.type === TalentTreeNodeType.CLASS_REQUIREMENT
          const { count, url, color, label } = getRequirementIconProps(
            isClassRequirement,
            data.name
          )
          const showBiggerIcons =
            isClassRequirement ||
            data.type === TalentTreeNodeType.OFFER_REQUIREMENT ||
            data.type === TalentTreeNodeType.EVENT_BASED_REQUIREMENT

          let circleRadius = 0
          if (showBiggerIcons) {
            circleRadius = 28
          } else if (count === 1) {
            circleRadius = 13
          } else if (count === 2) {
            circleRadius = 17
          } else if (count === 3) {
            circleRadius = 26
          }

          nodeElement
            .append('circle')
            .attr('r', circleRadius)
            .attr('class', cx('tree-root-node-circle'))
            .style('--color', color)

          nodeElement
            .append('text')
            .attr('x', 0)
            .attr('y', -circleRadius - 8)
            .attr('text-anchor', 'middle')
            .attr('class', cx('tree-root-node-label', `tree-root-node-label--depth-${maxDepth}`))
            .style('fill', lighten(color, 5))
            .text(label)

          if (count > 0) {
            const iconSize = showBiggerIcons ? 52 : 22
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
        // Talent nodes - calculate dynamic height for this specific node
        const descLines = wrapText(data.description, nodeWidth + 10, 10)
        const descriptionHeight = Math.max(
          baseDescriptionHeight,
          descLines.length * descriptionLineHeight
        )
        const dynamicNodeHeight = nameHeight + descriptionHeight + 6

        nodeElement
          .append('rect')
          .attr('width', nodeWidth + 6)
          .attr('height', dynamicNodeHeight + 6)
          .attr('x', -(nodeWidth + 6) / 2)
          .attr('y', -(dynamicNodeHeight + 6) / 2)
          .attr('class', cx('talent-node-glow', `talent-node-glow--tier-${data.tier || 0}`))

        nodeElement
          .append('rect')
          .attr('width', nodeWidth)
          .attr('height', dynamicNodeHeight)
          .attr('x', -nodeWidth / 2)
          .attr('y', -dynamicNodeHeight / 2)
          .attr('class', cx('talent-node', `talent-node--tier-${data.tier || 0}`))

        nodeElement
          .append('line')
          .attr('x1', -nodeWidth / 2)
          .attr('y1', -dynamicNodeHeight / 2 + nameHeight)
          .attr('x2', nodeWidth / 2)
          .attr('y2', -dynamicNodeHeight / 2 + nameHeight)
          .attr(
            'class',
            cx('talent-node-separator', `talent-node-separator--tier-${data.tier || 0}`)
          )

        // Add content group
        const contentGroup = nodeElement.append('g').attr('class', cx('tree-node-content'))

        const nameGroup = contentGroup
          .append('g')
          .attr('transform', `translate(0, ${-dynamicNodeHeight / 2 + nameHeight / 2})`)

        nameGroup
          .append('text')
          .attr('x', 0)
          .attr('y', 4)
          .text(data.name)
          .attr('class', cx('talent-node-name'))

        // Add description text with wrapping
        const descGroup = contentGroup
          .append('g')
          .attr(
            'transform',
            `translate(0, ${-dynamicNodeHeight / 2 + nameHeight + descriptionHeight / 2})`
          )

        descLines.forEach((line, i) => {
          const segments = parseTalentDescriptionLine(line)
          const foreignObject = descGroup
            .append('foreignObject')
            .attr('x', -nodeWidth / 2)
            .attr(
              'y',
              i * descriptionLineHeight - ((descLines.length - 1) * descriptionLineHeight) / 2 - 9
            )
            .attr('width', nodeWidth)
            .attr('height', descriptionLineHeight)

          let htmlContent = ''
          segments.forEach((segment) => {
            if (segment.type === 'text') {
              htmlContent += segment.content
            } else if (segment.type === 'image' && 'icon' in segment) {
              htmlContent += `<img src="${segment.icon}" width="8" height="8" style="vertical-align: middle; margin: 0 1px 1px;" />`
            }
          })

          foreignObject
            .append('xhtml:div')
            .attr('class', cx('talent-node-description'))
            .html(htmlContent)
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
