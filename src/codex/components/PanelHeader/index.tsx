import { MagnifyingGlassIcon, StackedCardsIcon } from '@/shared/components/Icons'
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
  TreasureCards: 'Treasure cards',
  CardPools: 'Card pools',
  SpecialWeapons: 'Special Basic Attacks',
}

interface PanelHeaderProps {
  type: PanelHeaderType
}

const PanelHeader = ({ type }: PanelHeaderProps) => {
  const renderIcon = () => {
    if (type === 'Search') {
      return <MagnifyingGlassIcon className={cx('panel-header__magnifying-glass-icon')} />
    } else {
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
