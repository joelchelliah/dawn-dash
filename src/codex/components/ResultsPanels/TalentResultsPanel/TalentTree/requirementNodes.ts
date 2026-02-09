import { Selection } from 'd3-selection'
import { HierarchyPointLink } from 'd3-hierarchy'

import { createCx } from '@/shared/utils/classnames'
import { lighten } from '@/shared/utils/classColors'

import { HierarchicalTalentTreeNode, TalentTreeNodeType } from '@/codex/types/talents'
import { getTalentRequirementIconProps } from '@/codex/utils/talentTreeHelper'
import { getNodeHalfWidth } from '@/codex/utils/talentNodeDimensions'
import {
  REQUIREMENT_CLASS_TO_FILTER_OPTIONS_MAP,
  REQUIREMENT_ENERGY_TO_FILTER_OPTIONS_MAP,
} from '@/codex/constants/talentsMappingValues'
import { REQUIREMENT_NODE, REQUIREMENT_INDICATOR } from '@/codex/constants/talentTreeValues'

import styles from './index.module.scss'

const cx = createCx(styles)

type NodeElement = Selection<SVGGElement, unknown, null, undefined>

/**
 * Renders requirement indicators on links showing new requirements introduced by target node
 */
export function renderRequirementIndicators(
  svg: NodeElement,
  defs: NodeElement,
  link: HierarchyPointLink<HierarchicalTalentTreeNode>,
  newRequirements: string[],
  linkIndex: number
): void {
  const targetHalfWidth = getNodeHalfWidth(link.target.data)

  // Position near the end of the link, just before the target node
  const indicatorX = link.target.y - targetHalfWidth
  const indicatorY = link.target.x

  const isOnlyClassRequirement = newRequirements.every((requirement) =>
    Object.keys(REQUIREMENT_CLASS_TO_FILTER_OPTIONS_MAP).includes(requirement)
  )
  const isEnergyRequirement = newRequirements.some((requirement) =>
    Object.keys(REQUIREMENT_ENERGY_TO_FILTER_OPTIONS_MAP).includes(requirement)
  )

  const propsPerRequirement = newRequirements.map((requirement) =>
    getTalentRequirementIconProps(isOnlyClassRequirement, requirement)
  )

  const color = propsPerRequirement[0].color
  const count = propsPerRequirement.reduce((acc, curr) => acc + curr.count, 0)
  const url = propsPerRequirement[0].url
  const url2 =
    propsPerRequirement[0].count > 1
      ? propsPerRequirement[0].url2 || propsPerRequirement[0].url
      : propsPerRequirement[1]?.url
  const url3 =
    propsPerRequirement[0].count > 2
      ? propsPerRequirement[0].url3 || propsPerRequirement[0].url
      : propsPerRequirement[1]?.url2 || propsPerRequirement[1]?.url
  const iconSize = isEnergyRequirement
    ? REQUIREMENT_INDICATOR.ICON_SIZE.ENERGY
    : REQUIREMENT_INDICATOR.ICON_SIZE.CLASS

  // Tweaking of circle sizes and spacing to fit the different scenarios.
  let circleRx: number = REQUIREMENT_INDICATOR.CIRCLE.RX
  let circleRy: number = REQUIREMENT_INDICATOR.CIRCLE.RY
  let spacing = 0
  let nudgeToTheLeft: number = REQUIREMENT_INDICATOR.DEFAULT_NUDGE
  if (isEnergyRequirement && count === 1) {
    circleRx = REQUIREMENT_INDICATOR.ENERGY.SINGLE.RX
    circleRy = REQUIREMENT_INDICATOR.ENERGY.SINGLE.RY
    nudgeToTheLeft = REQUIREMENT_INDICATOR.ENERGY.SINGLE.NUDGE
  } else if (isEnergyRequirement && count === 2) {
    circleRx = REQUIREMENT_INDICATOR.ENERGY.DOUBLE.RX
    circleRy = REQUIREMENT_INDICATOR.ENERGY.DOUBLE.RY
    spacing = REQUIREMENT_INDICATOR.ENERGY.DOUBLE.SPACING
    nudgeToTheLeft = REQUIREMENT_INDICATOR.ENERGY.DOUBLE.NUDGE
  } else if (isEnergyRequirement && count === 3) {
    circleRx = REQUIREMENT_INDICATOR.ENERGY.TRIPLE.RX
    circleRy = REQUIREMENT_INDICATOR.ENERGY.TRIPLE.RY
    spacing = REQUIREMENT_INDICATOR.ENERGY.TRIPLE.SPACING
    nudgeToTheLeft = REQUIREMENT_INDICATOR.ENERGY.TRIPLE.NUDGE
  }
  const totalHeight = count * iconSize + (count - 1) * spacing
  const x = indicatorX - iconSize / 2 - nudgeToTheLeft
  const startY = indicatorY - totalHeight / 2

  const indicatorGroup = svg.append('g').attr('class', cx('requirement-indicator'))

  indicatorGroup
    .append('ellipse')
    .attr('rx', circleRx)
    .attr('ry', circleRy)
    .attr('cx', x + iconSize / 2)
    .attr('cy', indicatorY)
    .attr('class', cx('requirement-indicator-circle'))
    .style('--color', color)

  // Render each requirement icon vertically
  for (let i = 0; i < count; i++) {
    const y = startY + i * (iconSize + spacing)

    // Single icon - apply circular clipping
    if (count === 1) {
      const clipId = `requirement-clip-${linkIndex}-${i}`

      defs
        .append('clipPath')
        .attr('id', clipId)
        .append('circle')
        .attr('r', iconSize / 2)
        .attr('cx', x + iconSize / 2)
        .attr('cy', y + iconSize / 2)

      indicatorGroup
        .append('image')
        .attr('href', url)
        .attr('x', x)
        .attr('y', y)
        .attr('width', iconSize)
        .attr('height', iconSize)
        .attr('clip-path', `url(#${clipId})`)

      // Multiple icons - no clipping, stack them vertically
    } else {
      let currentUrl = url
      if (i === 1 && url2) {
        currentUrl = url2
      } else if (i === 2 && url3) {
        currentUrl = url3
      }
      indicatorGroup
        .append('image')
        .attr('href', currentUrl)
        .attr('x', x)
        .attr('y', y)
        .attr('width', iconSize)
        .attr('height', iconSize)
        .style('opacity', REQUIREMENT_INDICATOR.STACKED_ICON_OPACITY)
    }
  }
}

/**
 * Renders the icon(s) for a requirement node
 */
function renderRequirementIcons(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  nodeElement: Selection<SVGGElement, any, any, any>,
  defs: Selection<SVGDefsElement, unknown, null, undefined>,
  data: HierarchicalTalentTreeNode,
  nodeIndex: number
): void {
  const { count, url, url2 } = getTalentRequirementIconProps(
    data.type === TalentTreeNodeType.CLASS_REQUIREMENT,
    data.name
  )

  if (count === 0) return

  const showBiggerIcons =
    data.type === TalentTreeNodeType.CLASS_REQUIREMENT ||
    data.type === TalentTreeNodeType.OFFER_REQUIREMENT ||
    data.type === TalentTreeNodeType.EVENT_REQUIREMENT ||
    data.type === TalentTreeNodeType.CARD_REQUIREMENT

  const iconSize = showBiggerIcons
    ? REQUIREMENT_NODE.ICON_SIZE.LARGE
    : REQUIREMENT_NODE.ICON_SIZE.SMALL
  const spacing = REQUIREMENT_NODE.ICON_SPACING
  const totalWidth = count * iconSize + (count - 1) * spacing
  const startX = -totalWidth / 2

  for (let i = 0; i < count; i++) {
    const x = startX + i * (iconSize + spacing)

    // Single icon - apply circular clipping
    if (count === 1) {
      const clipId = `circle-clip-${nodeIndex}-${i}`

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

      // Multiple icons - no clipping, place them next to each other
    } else {
      // For multi-energy requirements, like DEX&STR
      const currentUrl = i === 1 && url2 ? url2 : url
      nodeElement
        .append('image')
        .attr('href', currentUrl)
        .attr('x', x)
        .attr('y', -iconSize / 2)
        .attr('width', iconSize)
        .attr('height', iconSize)
    }
  }
}

/**
 * Renders a requirement node (class, energy, event, card, or offer requirement)
 */
export function renderRequirementNode(
  nodeElement: NodeElement,
  defs: Selection<SVGDefsElement, unknown, null, undefined>,
  data: HierarchicalTalentTreeNode,
  nodeIndex: number,
  maxDepth: number
): void {
  const { count, color, label } = getTalentRequirementIconProps(
    data.type === TalentTreeNodeType.CLASS_REQUIREMENT,
    data.name
  )

  const showBiggerIcons =
    data.type === TalentTreeNodeType.CLASS_REQUIREMENT ||
    data.type === TalentTreeNodeType.OFFER_REQUIREMENT ||
    data.type === TalentTreeNodeType.EVENT_REQUIREMENT ||
    data.type === TalentTreeNodeType.CARD_REQUIREMENT

  let circleRadius = 0
  if (showBiggerIcons) {
    circleRadius = REQUIREMENT_NODE.RADIUS_DEFAULT
  } else if (count > 0) {
    circleRadius =
      REQUIREMENT_NODE.RADIUS_BY_REQUIREMENT_COUNT[
        count as keyof typeof REQUIREMENT_NODE.RADIUS_BY_REQUIREMENT_COUNT
      ] ?? 0
  }

  nodeElement
    .append('circle')
    .attr('r', circleRadius)
    .attr('class', cx('requirement-node-circle'))
    .style('--color', color)

  const labelParts = label.split(',').map((part) => part.trim())
  const lineHeight = REQUIREMENT_NODE.LABEL_LINE_HEIGHT
  const totalHeight = labelParts.length * lineHeight + REQUIREMENT_NODE.LABEL_BOTTOM_MARGIN
  const startY = -circleRadius - totalHeight + lineHeight / 2

  const textElement = nodeElement
    .append('text')
    .attr('x', 0)
    .attr('y', startY)
    .attr('text-anchor', 'middle')
    .attr('class', cx('requirement-node-label', `requirement-node-label--depth-${maxDepth}`))
    .style('fill', lighten(color, 5))

  labelParts.forEach((part, index) => {
    textElement
      .append('tspan')
      .attr('x', 0)
      .attr('dy', index === 0 ? 0 : lineHeight)
      .text(part)
  })

  renderRequirementIcons(nodeElement, defs, data, nodeIndex)
}
