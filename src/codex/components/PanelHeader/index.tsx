import {
  CrossedSwordsIcon,
  MagnifyingGlassIcon,
  StackedCardsIcon,
  StarTrailIcon,
} from '@/shared/components/Icons'
import Divider from '@/shared/components/Divider'
import { createCx } from '@/shared/utils/classnames'

import styles from './index.module.scss'

const cx = createCx(styles)

export type PanelHeaderType =
  | 'Search'
  | 'CardResults'
  | 'TalentResults'
  | 'EventResults'
  | 'TreasureCards'
  | 'CardPools'
  | 'SpecialWeapons'

const PANEL_TITLES: Record<PanelHeaderType, string> = {
  Search: 'Search',
  CardResults: 'Cards',
  TalentResults: 'Talents',
  EventResults: 'Event',
  TreasureCards: 'Treasure Cards',
  CardPools: 'Card Pools',
  SpecialWeapons: 'Special Basic Attacks',
}

interface PanelHeaderProps {
  type: PanelHeaderType
}

const PanelHeader = ({ type }: PanelHeaderProps) => {
  const renderIcon = () => {
    switch (type) {
      case 'Search':
        return <MagnifyingGlassIcon className={cx('panel-header__magnifying-glass-icon')} />
      case 'TreasureCards':
        return <StarTrailIcon className={cx('panel-header__star-trail-icon')} />
      case 'SpecialWeapons':
        return <CrossedSwordsIcon className={cx('panel-header__swords-icon')} />
      default:
        return <StackedCardsIcon className={cx('panel-header__cards-icon')} />
    }
  }

  return (
    <>
      <div className={cx('panel-header')}>
        {renderIcon()}
        <span className={cx('panel-header__title')}>{PANEL_TITLES[type]}</span>
      </div>
      <Divider spacingBottom="lg" />
    </>
  )
}

export default PanelHeader
