import { type HierarchyPointLink } from 'd3-hierarchy'

import { createCx } from '@/shared/utils/classnames'

import { HierarchicalTalentTreeNode } from '@/codex/types/talents'
import { getLinkColor } from '@/codex/utils/talentTreeHelper'
import { getNodeHalfWidth } from '@/codex/utils/talentNodeDimensions'

import styles from './links.module.scss'

const cx = createCx(styles)

/* eslint-disable @typescript-eslint/no-explicit-any */
interface DrawLinksParam {
  svg: any
  treeData: any
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/* eslint-disable @typescript-eslint/no-explicit-any */
export function drawLinks({ svg, treeData }: DrawLinksParam) {
  svg
    .selectAll('.link')
    .data(treeData.links().filter((link: any) => link.source.depth > 0)) // Skip links from virtual root
    .enter()
    .append('path')
    .attr('class', cx('link'))
    .attr('d', generateLinkPath)
    .style('stroke', (link: any) => {
      const { name, type } = link.source.data
      return getLinkColor(link, name, type)
    })
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * Generates a smooth curved path between nodes
 */
function generateLinkPath(d: HierarchyPointLink<HierarchicalTalentTreeNode>): string {
  const isRootNode = d.source.depth <= 1
  const sourceHalfWidth = getNodeHalfWidth(d.source.data)
  const targetHalfWidth = getNodeHalfWidth(d.target.data)

  const sourceX = isRootNode ? d.source.y : d.source.y + sourceHalfWidth
  const sourceY = d.source.x
  const targetX = d.target.y - targetHalfWidth
  const targetY = d.target.x

  // Smooth horizontal curve
  const midX = (sourceX + targetX) / 2
  return `M${sourceX},${sourceY}C${midX},${sourceY} ${midX},${targetY} ${targetX},${targetY}`
}
