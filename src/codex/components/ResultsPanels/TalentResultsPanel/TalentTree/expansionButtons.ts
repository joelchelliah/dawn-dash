import { select, Selection } from 'd3-selection'

import { createCx } from '@/shared/utils/classnames'
import { isNullOrEmpty } from '@/shared/utils/lists'

import { HierarchicalTalentTreeNode, TalentTreeNodeType } from '@/codex/types/talents'
import {
  getNodeInTree,
  matchesKeywordOrHasMatchingDescendant,
} from '@/codex/utils/talentTreeHelper'
import { NODE, EXPANSION_BUTTON } from '@/codex/constants/talentTreeValues'

import styles from './index.module.scss'

const cx = createCx(styles)

type NodeElement = Selection<SVGGElement, unknown, null, undefined>

/**
 * Renders an expansion button on a talent node if it has collapsible children
 */
export function renderExpansionButton(
  nodeElement: NodeElement,
  data: HierarchicalTalentTreeNode,
  fullTree: HierarchicalTalentTreeNode,
  parsedKeywords: string[],
  areChildrenExpanded: (name: string) => boolean,
  toggleChildrenExpansion: (name: string) => void
): void {
  if (data.type !== TalentTreeNodeType.TALENT) return

  const talentNodeInFullTree = getNodeInTree(data.name, TalentTreeNodeType.TALENT, fullTree)
  if (isNullOrEmpty(talentNodeInFullTree?.children)) return

  // Don't show button if any descendant matches keywords (button would be useless)
  if (
    talentNodeInFullTree.children.some((child) =>
      matchesKeywordOrHasMatchingDescendant(child, parsedKeywords)
    )
  )
    return

  const isExpanded = areChildrenExpanded(data.name)

  const xOffset = isExpanded
    ? EXPANSION_BUTTON.X_OFFSET.EXPANDED
    : EXPANSION_BUTTON.X_OFFSET.COLLAPSED
  const buttonX = NODE.WIDTH / 2 + xOffset
  const buttonY = 0
  const buttonRadius = EXPANSION_BUTTON.RADIUS
  const buttonHoverRadius = buttonRadius + EXPANSION_BUTTON.HOVER_RADIUS_ADDITION

  const buttonGroup = nodeElement
    .append('g')
    .attr('class', cx('expansion-button'))
    .attr('transform', `translate(${buttonX}, ${buttonY})`)
    .on('click', function (event) {
      event.stopPropagation()
      toggleChildrenExpansion(data.name)
    })

  buttonGroup.append('circle').attr('r', buttonRadius).attr('class', cx('expansion-button-circle'))

  buttonGroup.on('mouseenter', function () {
    select(this).select('circle').attr('r', buttonHoverRadius)
  })
  buttonGroup.on('mouseleave', function () {
    select(this).select('circle').attr('r', buttonRadius)
  })

  buttonGroup
    .append('text')
    .attr('x', 0)
    .attr('y', EXPANSION_BUTTON.TEXT_Y_OFFSET)
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'central')
    .attr('class', cx('expansion-button-text'))
    .text(isExpanded ? EXPANSION_BUTTON.SYMBOL.EXPANDED : EXPANSION_BUTTON.SYMBOL.COLLAPSED)
}
