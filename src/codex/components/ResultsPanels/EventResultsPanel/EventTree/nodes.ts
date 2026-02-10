import { Selection } from 'd3-selection'
import { HierarchyPointNode } from 'd3-hierarchy'

import { createCx } from '@/shared/utils/classnames'
import { truncateLine } from '@/shared/utils/textHelper'

import { CombatNode, DialogueNode, EndNode, EventTreeNode, SpecialNode } from '@/codex/types/events'
import {
  getNodeTextOrChoiceLabel,
  calculateEffectsBoxDimensions,
  calculateRequirementsBoxDimensions,
  calculateIndicatorDimensions,
  tweakLoopIndicatorHeightForChoiceNode,
  getEmojiMargin,
  hasChoiceLabel,
  hasText,
} from '@/codex/utils/eventNodeDimensions'
import { TEXT, INNER_BOX, NODE_BOX } from '@/codex/constants/eventTreeValues'
import { LevelOfDetail } from '@/codex/constants/eventSearchValues'
import { findNodeById } from '@/codex/utils/eventTreeHelper'
import { wrapEventText } from '@/codex/utils/eventTextWidthEstimation'

import styles from './index.module.scss'

const cx = createCx(styles)

type NodeElement = Selection<SVGGElement, unknown, null, undefined>

export function createGlowFilter(
  defs: Selection<SVGDefsElement, unknown, null, undefined>,
  filterId: string
): void {
  const blurAmount = '4'
  const filter = defs.append('filter').attr('id', filterId)

  filter.append('feGaussianBlur').attr('stdDeviation', blurAmount).attr('result', 'coloredBlur')

  const merge = filter.append('feMerge')
  merge.append('feMergeNode').attr('in', 'coloredBlur')
  merge.append('feMergeNode').attr('in', 'SourceGraphic')
}

interface NodeContentParams {
  getDimensions: (node: EventTreeNode) => [number, number]
  root: HierarchyPointNode<EventTreeNode>
  showLoopingIndicator: boolean
  showContinuesTags: boolean
  isCompact: boolean
  levelOfDetail: LevelOfDetail
}

export function renderNodeContent(
  node: NodeElement,
  data: EventTreeNode,
  params: NodeContentParams
): void {
  const { getDimensions, showLoopingIndicator, isCompact, root } = params

  if (data.type === 'choice') {
    const requirements = data.requirements || []
    const { height: reqBoxHeight, margin: reqBoxMarginBase } = calculateRequirementsBoxDimensions(
      data,
      data.choiceLabel.length > 0
    )
    // Hack: Since choice labels have such a large height we use a smaller margin for the requirements box
    const reqBoxMargin = reqBoxMarginBase / 2

    const hasLoopingIndicator = showLoopingIndicator && data.ref !== undefined
    const { height: loopIndicatorHeightBase, margin: loopIndicatorMargin } =
      calculateIndicatorDimensions(
        'loop',
        hasLoopingIndicator,
        data.choiceLabel.length > 0,
        reqBoxHeight > 0
      )

    const loopIndicatorHeight = tweakLoopIndicatorHeightForChoiceNode(
      loopIndicatorHeightBase,
      isCompact
    )

    const [currentNodeWidth, currentNodeHeight] = getDimensions(data)

    if (hasChoiceLabel(data)) {
      const textAreaHeight =
        currentNodeHeight -
        NODE_BOX.VERTICAL_PADDING * 2 -
        reqBoxMargin -
        reqBoxHeight -
        loopIndicatorHeight -
        loopIndicatorMargin
      const textAreaCenter = -currentNodeHeight / 2 + NODE_BOX.VERTICAL_PADDING + textAreaHeight / 2

      renderChoiceLabel(node, data.choiceLabel, currentNodeWidth, textAreaCenter)
    }

    const requirementsBoxY =
      currentNodeHeight / 2 -
      NODE_BOX.VERTICAL_PADDING -
      reqBoxHeight -
      loopIndicatorMargin -
      loopIndicatorHeight

    renderRequirementsBox(node, requirements, currentNodeWidth, reqBoxHeight, requirementsBoxY)
  } else if (
    data.type === 'end' ||
    data.type === 'dialogue' ||
    data.type === 'combat' ||
    data.type === 'special'
  ) {
    renderTextNodeContent(node, data, params)
  } else if (data.type === 'result') {
    const requirements = data.requirements || []
    const { height: reqBoxHeight } = calculateRequirementsBoxDimensions(data, false)

    const hasLoopingIndicator = showLoopingIndicator && data.ref !== undefined
    const { height: loopIndicatorHeight, margin: loopIndicatorMargin } =
      calculateIndicatorDimensions('loop', hasLoopingIndicator, false, reqBoxHeight > 0)

    const [currentNodeWidth, currentNodeHeight] = getDimensions(data)

    const requirementsBoxY =
      currentNodeHeight / 2 -
      NODE_BOX.VERTICAL_PADDING -
      reqBoxHeight -
      loopIndicatorMargin -
      loopIndicatorHeight

    renderRequirementsBox(node, requirements, currentNodeWidth, reqBoxHeight, requirementsBoxY)
  }

  if (showLoopingIndicator && data.ref !== undefined) {
    const [nodeWidth, nodeHeight] = getDimensions(data)
    const { height: loopIndicatorHeight } = calculateIndicatorDimensions(
      'loop',
      true,
      !isCompact,
      false
    )
    renderLoopIndicator(node, data, root, nodeWidth, nodeHeight, loopIndicatorHeight, isCompact)
  }
}

function renderChoiceLabel(
  node: NodeElement,
  choiceLabel: string,
  currentNodeWidth: number,
  translateY: number
): void {
  const labelGroup = node.append('g').attr('transform', `translate(0, ${translateY})`)

  const maxTextWidth = currentNodeWidth - TEXT.HORIZONTAL_PADDING * 2
  const choiceLines = wrapEventText(choiceLabel, maxTextWidth, 'choice')

  // Center the text lines vertically within the label group
  const totalTextHeight = choiceLines.length * TEXT.CHOICE_TEXT_HEIGHT
  const verticalCenteringOffset = -totalTextHeight / 2 + TEXT.CHOICE_BASELINE_OFFSET

  choiceLines.forEach((line, i) => {
    const yPosition = i * TEXT.CHOICE_TEXT_HEIGHT + verticalCenteringOffset

    labelGroup
      .append('text')
      .attr('class', cx('event-node-text', 'event-node-text--choice'))
      .attr('x', 0)
      .attr('y', yPosition)
      .text(line)
  })
}

function renderTextNodeContent(
  node: NodeElement,
  data: DialogueNode | EndNode | CombatNode | SpecialNode,
  params: NodeContentParams
): void {
  const { getDimensions, showLoopingIndicator, showContinuesTags, isCompact, levelOfDetail } =
    params

  const [currentNodeWidth, currentNodeHeight] = getDimensions(data)
  const nodeHasText = !isCompact && hasText(data)

  const { height: effectsBoxHeight, margin: effectsBoxMargin } = calculateEffectsBoxDimensions(
    data,
    currentNodeWidth,
    isCompact,
    nodeHasText
  )

  const { height: continueIndicatorHeight, margin: continueIndicatorMargin } =
    calculateIndicatorDimensions(
      'continue',
      Boolean(showContinuesTags && data.type === 'dialogue' && data.numContinues),
      nodeHasText,
      effectsBoxHeight > 0
    )

  const { height: loopIndicatorHeight, margin: loopIndicatorMargin } = calculateIndicatorDimensions(
    'loop',
    Boolean(showLoopingIndicator && data.ref !== undefined),
    nodeHasText,
    effectsBoxHeight > 0 || continueIndicatorHeight > 0
  )

  const otherNodeContentHeight =
    effectsBoxMargin +
    effectsBoxHeight +
    continueIndicatorMargin +
    continueIndicatorHeight +
    loopIndicatorMargin +
    loopIndicatorHeight

  renderNodeText(
    node,
    data,
    currentNodeWidth,
    currentNodeHeight,
    otherNodeContentHeight,
    levelOfDetail
  )

  if (effectsBoxHeight > 0) {
    const effects = data.effects ?? []
    const effectsBoxY =
      currentNodeHeight / 2 -
      NODE_BOX.VERTICAL_PADDING -
      effectsBoxHeight -
      continueIndicatorMargin -
      continueIndicatorHeight -
      loopIndicatorMargin -
      loopIndicatorHeight

    renderEffectsBox(node, effects, currentNodeWidth, effectsBoxY, effectsBoxHeight, isCompact)
  }

  if (continueIndicatorHeight > 0) {
    const numContinues = data.type === 'dialogue' ? (data.numContinues ?? 0) : 0
    renderContinueIndicator(
      node,
      currentNodeWidth,
      currentNodeHeight,
      numContinues,
      loopIndicatorHeight,
      loopIndicatorMargin,
      isCompact
    )
  }
}

function renderEffectsBox(
  node: NodeElement,
  effects: string[],
  nodeWidth: number,
  effectsBoxY: number,
  effectsBoxHeight: number,
  isCompact: boolean
): void {
  const maxEffectWidth = nodeWidth - INNER_BOX.HORIZONTAL_MARGIN_OR_PADDING * 4
  const effectLines = effects.flatMap((effect) => wrapEventText(effect, maxEffectWidth))
  const effectsGroup = node.append('g').attr('transform', `translate(0, ${effectsBoxY})`)

  effectsGroup
    .append('rect')
    .attr('class', cx('inner-box'))
    .attr('x', -nodeWidth / 2 + INNER_BOX.HORIZONTAL_MARGIN_OR_PADDING)
    .attr('y', 0)
    .attr('width', nodeWidth - INNER_BOX.HORIZONTAL_MARGIN_OR_PADDING * 2)
    .attr('height', effectsBoxHeight)

  // Add "Effect:" label inside dark box
  const effectsHeaderHeight = isCompact ? 0 : TEXT.LINE_HEIGHT + INNER_BOX.LISTINGS_HEADER_GAP
  const contentHeight = effectsHeaderHeight + effectLines.length * TEXT.LINE_HEIGHT
  const listingTopPadding = (effectsBoxHeight - contentHeight) / 2

  if (!isCompact) {
    effectsGroup
      .append('text')
      .attr('class', cx('event-node-text', 'event-node-text--effect-header'))
      .attr('x', -nodeWidth / 2 + INNER_BOX.HORIZONTAL_MARGIN_OR_PADDING * 2)
      .attr('y', listingTopPadding + TEXT.LINE_HEIGHT)
      .text('Effect:')
  }

  effectLines.forEach((effect, i) => {
    effectsGroup
      .append('text')
      .attr('class', cx('event-node-text', 'event-node-text--effect-item'))
      .attr('x', -nodeWidth / 2 + INNER_BOX.HORIZONTAL_MARGIN_OR_PADDING * 2)
      .attr('y', listingTopPadding / 2 + effectsHeaderHeight + (i + 1) * TEXT.LINE_HEIGHT)
      .text(effect)
  })
}

function renderContinueIndicator(
  node: NodeElement,
  nodeWidth: number,
  nodeHeight: number,
  numContinues: number,
  loopIndicatorHeight: number,
  loopIndicatorMargin: number,
  isCompact: boolean
): void {
  const continueIndicatorY =
    nodeHeight / 2 -
    NODE_BOX.VERTICAL_PADDING -
    INNER_BOX.INDICATOR_HEIGHT -
    loopIndicatorMargin -
    loopIndicatorHeight
  const continueText = isCompact ? `⏭️ × ${numContinues}` : `⏭️ Continues: ${numContinues}`

  const continueIndicator = node
    .append('g')
    .attr('transform', `translate(0, ${continueIndicatorY})`)

  continueIndicator
    .append('rect')
    .attr('class', cx('indicator-box'))
    .attr('x', -nodeWidth / 2 + INNER_BOX.HORIZONTAL_MARGIN_OR_PADDING)
    .attr('width', nodeWidth - INNER_BOX.HORIZONTAL_MARGIN_OR_PADDING * 2)
    .attr('height', INNER_BOX.INDICATOR_HEIGHT)

  continueIndicator
    .append('text')
    .attr('class', cx('event-node-text', 'event-node-text--indicator'))
    .attr('y', INNER_BOX.INDICATOR_HEIGHT / 2 + TEXT.BASELINE_OFFSET / 2)
    .text(continueText)
}

function renderLoopIndicator(
  node: NodeElement,
  data: EventTreeNode,
  root: HierarchyPointNode<EventTreeNode>,
  nodeWidth: number,
  nodeHeight: number,
  loopIndicatorHeight: number,
  isCompact: boolean
): void {
  const refNode = findNodeById(root, data.ref)
  const refNodeLabel = getNodeTextOrChoiceLabel(refNode)

  const labelText = refNodeLabel || ''
  const maxTextWidth = nodeWidth - INNER_BOX.HORIZONTAL_MARGIN_OR_PADDING * 4
  const refNodeLines = wrapEventText(labelText, maxTextWidth)
  const displayLine = refNodeLines[0] || ''
  const truncatedLine = displayLine === labelText ? displayLine : `${displayLine.slice(0, -3)}...`

  const loopIndicatorY = nodeHeight / 2 - NODE_BOX.VERTICAL_PADDING - loopIndicatorHeight
  const loopIndicatorText = isCompact ? `🔄 ${truncatedLine}` : `🔄 Loops back to:`
  const loopIndicatorTextClass = isCompact
    ? 'event-node-text--indicator-label'
    : 'event-node-text--indicator'
  const loopIndicatorTextY = INNER_BOX.INDICATOR_HEIGHT / 2 + TEXT.BASELINE_OFFSET / 2

  const loopIndicator = node.append('g').attr('transform', `translate(0, ${loopIndicatorY})`)

  loopIndicator
    .append('rect')
    .attr('class', cx('indicator-box'))
    .attr('x', -nodeWidth / 2 + INNER_BOX.HORIZONTAL_MARGIN_OR_PADDING)
    .attr('width', nodeWidth - INNER_BOX.HORIZONTAL_MARGIN_OR_PADDING * 2)
    .attr('height', loopIndicatorHeight)

  loopIndicator
    .append('text')
    .attr('class', cx('event-node-text', loopIndicatorTextClass))
    .attr('y', loopIndicatorTextY)
    .text(loopIndicatorText)

  if (!isCompact) {
    loopIndicator
      .append('text')
      .attr('class', cx('event-node-text', 'event-node-text--indicator-label'))
      .attr(
        'y',
        TEXT.LINE_HEIGHT +
          INNER_BOX.INDICATOR_HEADER_GAP +
          TEXT.LINE_HEIGHT / 2 +
          TEXT.BASELINE_OFFSET
      )
      .text(truncatedLine)
  }
}

function renderNodeText(
  node: NodeElement,
  data: DialogueNode | EndNode | CombatNode | SpecialNode,
  currentNodeWidth: number,
  currentNodeHeight: number,
  otherNodeContentHeight: number,
  levelOfDetail: LevelOfDetail
): void {
  const isCompact = levelOfDetail === LevelOfDetail.COMPACT
  const nodeHasText = !isCompact && hasText(data)
  if (!nodeHasText || !data.text) return

  const maxDisplayLines = TEXT.MAX_DISPLAY_LINES_BY_LEVEL_OF_DETAIL[levelOfDetail]
  const nodeType = data.type
  const emojiMargin = getEmojiMargin(data, levelOfDetail)

  const textAreaHeight = currentNodeHeight - NODE_BOX.VERTICAL_PADDING * 2 - otherNodeContentHeight
  const textAreaCenter = -currentNodeHeight / 2 + NODE_BOX.VERTICAL_PADDING + textAreaHeight / 2

  const maxTextWidth = currentNodeWidth - TEXT.HORIZONTAL_PADDING * 2
  const wrappedLines = wrapEventText(
    data.text,
    maxTextWidth,
    nodeType === 'special' ? 'special' : undefined
  )
  const displayLines = wrappedLines.slice(0, maxDisplayLines)

  if (wrappedLines.length > maxDisplayLines && displayLines[displayLines.length - 1]) {
    const lastLineIndex = displayLines.length - 1
    displayLines[lastLineIndex] = truncateLine(displayLines[lastLineIndex])
  }

  const lineHeight = nodeType === 'special' ? TEXT.SPECIAL_TEXT_HEIGHT : TEXT.LINE_HEIGHT
  const baselineOffset =
    nodeType === 'special' ? TEXT.SPECIAL_BASELINE_OFFSET : TEXT.BASELINE_OFFSET
  const totalTextHeight = displayLines.length * lineHeight
  const verticalCenteringOffset =
    textAreaCenter + emojiMargin - totalTextHeight / 2 + baselineOffset

  displayLines.forEach((line, i) => {
    const y = i * lineHeight + verticalCenteringOffset

    node
      .append('text')
      .attr('class', cx('event-node-text', `event-node-text--${nodeType}`))
      .attr('x', 0)
      .attr('y', y)
      .text(line)
  })
}

function renderRequirementsBox(
  node: NodeElement,
  requirements: string[],
  currentNodeWidth: number,
  reqBoxHeight: number,
  translateY: number
): void {
  if (requirements.length === 0) return

  const reqGroup = node.append('g').attr('transform', `translate(0, ${translateY})`)

  reqGroup
    .append('rect')
    .attr('class', cx('inner-box'))
    .attr('x', -currentNodeWidth / 2 + INNER_BOX.HORIZONTAL_MARGIN_OR_PADDING)
    .attr('y', 0)
    .attr('width', currentNodeWidth - INNER_BOX.HORIZONTAL_MARGIN_OR_PADDING * 2)
    .attr('height', reqBoxHeight)

  const contentHeight =
    TEXT.LINE_HEIGHT + INNER_BOX.LISTINGS_HEADER_GAP + requirements.length * TEXT.LINE_HEIGHT
  const listingTopPadding = (reqBoxHeight - contentHeight) / 2

  reqGroup
    .append('text')
    .attr('class', cx('event-node-text', 'event-node-text--requirement-header'))
    .attr('x', -currentNodeWidth / 2 + INNER_BOX.HORIZONTAL_MARGIN_OR_PADDING * 2)
    .attr('y', listingTopPadding + TEXT.LINE_HEIGHT)
    .text('Requires:')

  requirements.forEach((req: string, i: number) => {
    reqGroup
      .append('text')
      .attr('class', cx('event-node-text', 'event-node-text--requirement-item'))
      .attr('x', -currentNodeWidth / 2 + INNER_BOX.HORIZONTAL_MARGIN_OR_PADDING * 2)
      .attr(
        'y',
        listingTopPadding +
          TEXT.LINE_HEIGHT +
          INNER_BOX.LISTINGS_HEADER_GAP +
          (i + 1) * TEXT.BASELINE_OFFSET
      )
      .text(req)
  })
}
