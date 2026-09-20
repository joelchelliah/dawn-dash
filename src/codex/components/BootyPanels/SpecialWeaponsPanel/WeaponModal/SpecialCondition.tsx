import { useMemo } from 'react'

import { createCx } from '@/shared/utils/classnames'
import { capitalize } from '@/shared/utils/textHelper'

import { CardData } from '@/codex/types/cards'

import { ArtworkLinkItem, ArtworkLinkList } from '../../shared/ArtworkLinkList'
import { CardSourceItem, EventSourceItem } from '../../shared/ArtworkSourceItem'

import styles from './SpecialCondition.module.scss'

import type { CustomConditionSource, SpecialCondition } from './conditionTypes'

const cx = createCx(styles)

const ARTWORK_SIZE = 32
const ARTWORK_SIZE_MOBILE = 24

/*
 * To tweak: raise CHAR_WIDTH_RATIO if names truncate early, raise SLACK for looser columns, and
 * raise the caps to give long names more room at the description's expense.
 */
const CHAR_WIDTH_RATIO = 0.52
const SLACK_REM = 0.5
const MAX_WIDTH_REM = 15
const MAX_WIDTH_MOBILE_REM = 9

const FONT_SIZE_PX = 14
const FONT_SIZE_MOBILE_PX = 12

const ROW_GAP_PX = 8
const ROW_PADDING_PX = 16
const REM_PX = 16

const toColumnWidth = (
  longestName: number,
  fontSizePx: number,
  artworkPx: number,
  maxRem: number
): number => {
  const textPx = longestName * CHAR_WIDTH_RATIO * fontSizePx
  const widthRem = (textPx + artworkPx + ROW_GAP_PX + ROW_PADDING_PX) / REM_PX + SLACK_REM

  return Math.min(widthRem, maxRem)
}

const getConditionNames = ({ cards, talents, events, custom }: SpecialCondition): string[] => [
  ...(custom ? [custom.name] : []),
  ...(events ?? []),
  ...(talents ?? []),
  ...(cards ?? []),
]

export const getCardColumnWidths = (condition: SpecialCondition) => {
  const longest = getConditionNames(condition).reduce((max, name) => Math.max(max, name.length), 0)

  return {
    width: toColumnWidth(longest, FONT_SIZE_PX, ARTWORK_SIZE, MAX_WIDTH_REM),
    widthMobile: toColumnWidth(
      longest,
      FONT_SIZE_MOBILE_PX,
      ARTWORK_SIZE_MOBILE,
      MAX_WIDTH_MOBILE_REM
    ),
  }
}

interface SpecialConditionProps {
  condition: SpecialCondition
  cardData: CardData[] | undefined
}

function SpecialCondition({ condition, cardData }: SpecialConditionProps): JSX.Element {
  const categoriesByName = useMemo(
    () => new Map((cardData ?? []).map((card) => [card.name, card.category])),
    [cardData]
  )

  const { width, widthMobile } = getCardColumnWidths(condition)

  // Handed to the stylesheet as custom properties, so the mobile width stays behind its media
  // query rather than needing a breakpoint check in JS.
  const widths = {
    '--special-condition-card-width': `${width}rem`,
    '--special-condition-card-width-mobile': `${widthMobile}rem`,
  } as React.CSSProperties

  const sizes = { artworkSize: ARTWORK_SIZE, artworkSizeMobile: ARTWORK_SIZE_MOBILE }

  return (
    <div className={cx('special-condition')} style={widths}>
      <div className={cx('special-condition__cards')}>
        <ArtworkLinkList layout="stacked">
          {condition.custom && <SpecialConditionCustom source={condition.custom} />}
          {condition.events?.map((name) => (
            <EventSourceItem key={name} name={name} {...sizes} />
          ))}
          {condition.talents?.map((name) => (
            <CardSourceItem key={name} name={name} isTalent {...sizes} />
          ))}
          {condition.cards?.map((name) => (
            <CardSourceItem
              key={name}
              name={name}
              category={categoriesByName.get(name)}
              {...sizes}
            />
          ))}
        </ArtworkLinkList>
      </div>
      <div className={cx('special-condition__description')}>{condition.description}</div>
    </div>
  )
}

function SpecialConditionCustom({ source }: { source: CustomConditionSource }): JSX.Element {
  const { name, type, link, imageUrl } = source

  return (
    <ArtworkLinkItem
      name={name}
      href={link}
      isExternal
      src={imageUrl}
      subtitles={[capitalize(type)]}
      artworkSize={ARTWORK_SIZE}
      artworkSizeMobile={ARTWORK_SIZE_MOBILE}
    />
  )
}

export default SpecialCondition
